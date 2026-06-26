import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { CapsuleGeometry, DepthTexture, Mesh, MeshBasicMaterial, OrthographicCamera, PerspectiveCamera, Plane, PlaneGeometry, ShaderMaterial, Vector3, WebGLRenderTarget } from "three";



import {
    CameraControllerTransform,
    frame_transforms
} from "./SpectatorCameraController";

export interface MixedRealityCameraControllerProps {
    first_person_transform?: CameraControllerTransform;
    third_person_transform?: CameraControllerTransform;
}

const PLAYER_CAPSULE_LAYER_TP = 1;

const PRESENTATION_LAYER_RP = 2;

const fragment_depth_to_alpha = `uniform sampler2D tDepth;
varying vec2 vUv;

void main() {
    float depth = texture2D(tDepth, vUv).r;

    // use smoothstep to create a soft, anti-aliased edge at the transition between player and background.
    float alpha = 1.0 - smoothstep(0.95, 1.0, depth);
    
    gl_FragColor = vec4(vec3(0.0), alpha); 
}`;

export const MixedRealityCameraController = ({
    first_person_transform = frame_transforms.first_person(),
    third_person_transform = frame_transforms.third_person({
        position_ref: { current: [0, 0, 0] as unknown as Vector3 },
        quaternion_ref: { current: [0, 0, 0, 1] as unknown as Vector3 }
    })
}: MixedRealityCameraControllerProps) => {
    const { size, gl } = useThree();

    const first_person_camera = useMemo(() => {
        return new PerspectiveCamera(75, size.width / size.height, 0.1, 1000);
    }, [size.width, size.height]);

    const third_person_camera = useMemo(() => {
        return new PerspectiveCamera(75, size.width / size.height, 0.1, 1000);
    }, [size.width, size.height]);

    const plane_render_camera = useMemo(() => {
        return new OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    }, []);

    const clipping_plane = useMemo(() => {
        return new Plane(new Vector3(0, 0, -1), 0.1);
    }, []);

    // enable local clipping
    useEffect(() => {
        const old_setting = gl.localClippingEnabled;
        gl.localClippingEnabled = true;
        return () => {
            gl.localClippingEnabled = old_setting;
        };
    }, []);

    const player_capsule_geometry = useMemo(() => {
        return new CapsuleGeometry(0.3, 1.7, 4, 8);
    }, []);

    const player_capsule_material = useMemo(() => {
        return new MeshBasicMaterial({
            colorWrite: false,
            depthWrite: true,
            depthTest: true
        });
    }, []);

    const player_capsule_mesh = useMemo(() => {
        return new Mesh(player_capsule_geometry, player_capsule_material);
    }, [player_capsule_geometry, player_capsule_material]);

    const alpha_mask_material = useMemo(() => {
        return new ShaderMaterial({
            fragmentShader: fragment_depth_to_alpha
        });
    }, []);

    const presentation_render_plane = useMemo(() => {
        const plane_geometry = new PlaneGeometry(2, 2);
        return new Mesh(plane_geometry, alpha_mask_material);
    }, [alpha_mask_material]);

    // assign layers
    useEffect(() => {
        third_person_camera.add(player_capsule_mesh);
        player_capsule_mesh.layers.set(PLAYER_CAPSULE_LAYER_TP);

        return () => {
            third_person_camera.remove(player_capsule_mesh);
        };
    }, [third_person_camera, player_capsule_mesh]);

    useEffect(() => {
        plane_render_camera.add(presentation_render_plane);
        presentation_render_plane.layers.set(PRESENTATION_LAYER_RP);

        return () => {
            plane_render_camera.remove(presentation_render_plane);
        };
    }, [plane_render_camera, presentation_render_plane]);

    useFrame(({ gl, scene, camera }) => {
        gl.render(scene, camera);

        if (!gl.xr.isPresenting) {
            return;
        }

        const headset_camera = gl.xr.getCamera();
        const {
            new_position: first_person_position,
            new_quaternion: first_person_quaternion
        } = first_person_transform({
            spec_camera: first_person_camera,
            headset_cameras: headset_camera,
            gl,
            current: {
                position: first_person_camera.position.clone(),
                quaternion: first_person_camera.quaternion.clone()
            }
        });

        const {
            new_position: third_person_position,
            new_quaternion: third_person_quaternion
        } = third_person_transform({
            spec_camera: third_person_camera,
            headset_cameras: headset_camera,
            gl,
            current: {
                position: third_person_camera.position.clone(),
                quaternion: third_person_camera.quaternion.clone()
            }
        });

        first_person_camera.position.copy(first_person_position);
        first_person_camera.quaternion.copy(first_person_quaternion);

        third_person_camera.position.copy(third_person_position);
        third_person_camera.quaternion.copy(third_person_quaternion);

        const xr_state = gl.xr.enabled;
        const render_target = gl.getRenderTarget();

        gl.xr.enabled = false;

        // composite into 4 tile (unity style) MR output
        // TL: foreground
        // TR: alpha mask
        // BL: third person camera feed
        // BR: first person camera feed

        // use scissor test to render each quadrant, starting with TR as it's ready
        gl.setRenderTarget(null);
        gl.clear();

        // render first person camera normally
        gl.setScissorTest(true);
        gl.setScissor(0, 0, size.width / 2, size.height / 2);
        gl.render(scene, first_person_camera);

        // render clean third person feed to BL quadrant
        third_person_camera.layers.disable(PLAYER_CAPSULE_LAYER_TP);

        gl.setScissor(0, size.height / 2, size.width / 2, size.height / 2);
        gl.render(scene, third_person_camera);

        // compute what's in front of the player from third person camera (depth buffer)

        // set clipping plane, facing camera at position of vr headset
        const camera_forward = new Vector3(0, 0, -1).applyQuaternion(
            third_person_quaternion
        );
        clipping_plane.normal.copy(camera_forward).negate();
        clipping_plane.constant = -(
            third_person_position.dot(clipping_plane.normal) +
            third_person_camera.near
        );

        // clip from plane, excluding objects marked mr_foreground
        gl.clippingPlanes = [clipping_plane];
        scene.traverse((object) => {
            if (
                object.userData.mr_foreground &&
                object instanceof Mesh &&
                object.material
            ) {
                object.material.clippingPlanes = [clipping_plane];
            }
        });

        // place player capsule at headset position, to occlude the player from the third person camera
        player_capsule_mesh.position.copy(first_person_position);
        player_capsule_mesh.quaternion.copy(first_person_quaternion);
        third_person_camera.layers.enable(PLAYER_CAPSULE_LAYER_TP);

        // capture the foreground colour and depth
        gl.setScissorTest(false);
        const foreground = new WebGLRenderTarget(size.width, size.height);
        const foreground_depth = new DepthTexture(size.width, size.height);
        foreground.depthTexture = foreground_depth;
        gl.setRenderTarget(foreground);
        gl.clear();
        gl.render(scene, third_person_camera);

        // compute alpha mask from captured depth texture using the fragment shader
        alpha_mask_material.uniforms = {
            tDepth: { value: foreground_depth }
        };

        // TR: alpha mask
        gl.setScissorTest(true);
        gl.setScissor(
            size.width / 2,
            size.height / 2,
            size.width / 2,
            size.height / 2
        );
        gl.setRenderTarget(null);
        gl.render(scene, third_person_camera);

        // TL: foreground
        // TODO: store to colour render target rather than re-rendering
        gl.setScissor(0, size.height / 2, size.width / 2, size.height / 2);
        gl.render(scene, third_person_camera);

        // restore xr rendering state
        gl.clippingPlanes = [];
        gl.setScissorTest(false);
        gl.setRenderTarget(render_target);
        gl.xr.enabled = xr_state;
    }, 1);

    return null;
};

// TODO: needs fixes
