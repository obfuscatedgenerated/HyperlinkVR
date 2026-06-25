import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, type RefObject } from "react";
import {
    PerspectiveCamera,
    type Vector3,
    type Quaternion,
    type WebGLRenderer,
    type WebXRArrayCamera,
    type Object3D
} from "three";
import { Eye } from "./types";


// TODO: params kinda redundant (having current, as well as being able to mod in place) but will keep as is for consistency for now
interface CameraControllerTransformParams {
    spec_camera: PerspectiveCamera,
    headset_cameras: WebXRArrayCamera,
    gl: WebGLRenderer,
    current: {
        position: Vector3,
        quaternion: Quaternion
    }
}

export type CameraControllerTransform = ({spec_camera, gl, current}: CameraControllerTransformParams) => {
    new_position: Vector3,
    new_quaternion: Quaternion
}

export const frame_transforms: Record<string, (...args: any[]) => CameraControllerTransform> = {
    first_person: (preferred_eye: Eye = Eye.Left) => ({headset_cameras}) => {
        const eye_camera = headset_cameras.cameras[preferred_eye] || headset_cameras;
        return {
            new_position: eye_camera.position.clone(),
            new_quaternion: eye_camera.quaternion.clone()
        }
    },

    third_person: ({position_ref, quaternion_ref}: {position_ref: RefObject<Vector3>, quaternion_ref: RefObject<Quaternion>}) => ({current}) => {
        const new_position = position_ref.current ? position_ref.current.clone() : current.position;
        const new_quaternion = quaternion_ref.current ? quaternion_ref.current.clone() : current.quaternion;
        return {
            new_position,
            new_quaternion
        }
    },

    third_person_from_object: (object: Object3D) => () => {
        const new_position = object.position.clone();
        const new_quaternion = object.quaternion.clone();
        return {
            new_position,
            new_quaternion
        }
    }
}

export const SpectatorCameraController = ({frame_transform}: {frame_transform: CameraControllerTransform}) => {
    const { size } = useThree();

    const spec_camera = useMemo(() => {
        return new PerspectiveCamera(75, size.width / size.height, 0.1, 1000);
    }, [size.width, size.height]);

    useFrame(({ gl, scene, camera }) => {
        if (gl.xr.isPresenting) {
            gl.render(scene, camera);

            const headset_camera = gl.xr.getCamera();
            const { new_position, new_quaternion } = frame_transform({
                spec_camera,
                headset_cameras: headset_camera,
                gl,
                current: {
                    position: spec_camera.position.clone(),
                    quaternion: spec_camera.quaternion.clone()
                }
            });

            spec_camera.position.copy(new_position);
            spec_camera.quaternion.copy(new_quaternion);

            const xr_state = gl.xr.enabled;
            const render_target = gl.getRenderTarget();

            gl.xr.enabled = false;
            gl.setRenderTarget(null);
            gl.clear();

            // push the new frame to the render
            gl.render(scene, spec_camera);

            // restore old render target and xr state to continue rendering the headset view
            // TODO: is this actually necessary? could be more performant without
            gl.setRenderTarget(render_target);
            gl.xr.enabled = xr_state;
        } else {
            gl.render(scene, camera);
        }
    }, 1);

    return null;
};
