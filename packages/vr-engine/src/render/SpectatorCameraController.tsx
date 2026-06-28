import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, type RefObject } from "react";
import { PerspectiveCamera, Vector3, type Object3D, type Quaternion, type WebGLRenderer, type WebXRArrayCamera } from "three";

import { Layer } from "./layers";
import { Eye } from "../types";


// TODO: params kinda redundant (having current, as well as being able to mod in place) but will keep as is for consistency for now
interface CameraControllerTransformParams {
    spec_camera: PerspectiveCamera,
    headset_cameras: WebXRArrayCamera,
    gl: WebGLRenderer
}

// mutate in place!
export type CameraControllerTransform = ({spec_camera, gl}: CameraControllerTransformParams) => void;

export interface CameraControllerConfiguration {
    frame_transform: CameraControllerTransform;
    layers: Layer[];
}

// TODO: this loses type safety as key is string!
export const frame_transforms: Record<string, (...args: any[]) => CameraControllerTransform> = {
    first_person: (preferred_eye: Eye = Eye.Left) => ({headset_cameras, spec_camera}) => {
        const eye_camera = headset_cameras.cameras[preferred_eye] || headset_cameras;
        spec_camera.position.copy(eye_camera.position);
        spec_camera.quaternion.copy(eye_camera.quaternion);
    },

    third_person: ({position_ref, quaternion_ref}: {position_ref: RefObject<Vector3>, quaternion_ref: RefObject<Quaternion>}) => ({spec_camera}) => {
        if (!position_ref.current || !quaternion_ref.current) {
            return;
        }

        spec_camera.position.copy(position_ref.current);
        spec_camera.quaternion.copy(quaternion_ref.current);
    },

    third_person_from_object: (object_ref: RefObject<Object3D>) => ({spec_camera}) => {
        if (!object_ref.current) {
            return;
        }

        // copy the world position and quaternion of the object to the spectator camera
        object_ref.current.getWorldPosition(spec_camera.position);
        object_ref.current.getWorldQuaternion(spec_camera.quaternion);
    }
} as const;

export const camera_controller_configs: Record<string, (...args: any[]) => CameraControllerConfiguration> = {
    first_person: (preferred_eye: Eye = Eye.Left) => ({
        frame_transform: frame_transforms.first_person(preferred_eye),
        layers: [Layer.Default, Layer.PlayerModel_TorsoAndHands, Layer.ThirdPerson_ForceHide]
    }),

    third_person: ({position_ref, quaternion_ref}: {position_ref: RefObject<Vector3>, quaternion_ref: RefObject<Quaternion>}) => ({
        frame_transform: frame_transforms.third_person({position_ref, quaternion_ref}),
        layers: [Layer.Default, Layer.PlayerModel_TorsoAndHands, Layer.PlayerModel_Head]
    }),

    third_person_from_object: (object_ref: RefObject<Object3D>) => ({
        frame_transform: frame_transforms.third_person_from_object(object_ref),
        layers: [Layer.Default, Layer.PlayerModel_TorsoAndHands, Layer.PlayerModel_Head]
    })
} as const;

export const SpectatorCameraController = ({config = camera_controller_configs.first_person(), horizontal_fov = 50}: {config?: CameraControllerConfiguration, horizontal_fov?: number}) => {
    const { size } = useThree();

    const spec_camera = useMemo(() => {
        return new PerspectiveCamera(50, 16 / 9, 0.1, 1000);
    }, []);

    // update aspect when size changes (dont destroy camera on resize!)
    useEffect(() => {
        spec_camera.aspect = size.width / size.height;
        spec_camera.updateProjectionMatrix();
    }, [size.width, size.height, spec_camera]);

    // update fov when horizontal_fov changes
    useEffect(() => {
        const vertical_fov = 2 * Math.atan(Math.tan((horizontal_fov * Math.PI / 180) / 2) * (size.height / size.width)) * (180 / Math.PI);
        spec_camera.fov = vertical_fov;
        spec_camera.updateProjectionMatrix();
    }, [horizontal_fov, spec_camera]);

    // update visible layers on change in config.layers
    useEffect(() => {
        spec_camera.layers.disableAll();
        config.layers.forEach(layer => spec_camera.layers.enable(layer));
    }, [config.layers, spec_camera]);

    useFrame(({ gl, scene, camera }) => {
        gl.render(scene, camera);

        if (!gl.xr.isPresenting) {
            return;
        }

        const headset_camera = gl.xr.getCamera();
        config.frame_transform({
            spec_camera,
            headset_cameras: headset_camera,
            gl
        });

        const xr_state = gl.xr.enabled;
        const render_target = gl.getRenderTarget();

        gl.xr.enabled = false;
        gl.setRenderTarget(null);
        gl.clear();

        // push the new frame to the render
        gl.render(scene, spec_camera);

        // restore old render target and xr state to continue rendering the headset view
        gl.setRenderTarget(render_target);
        gl.xr.enabled = xr_state;
    }, 1);

    return null;
};
