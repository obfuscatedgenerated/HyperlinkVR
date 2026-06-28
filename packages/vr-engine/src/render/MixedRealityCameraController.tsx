import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { CapsuleGeometry, DepthTexture, Mesh, MeshBasicMaterial, OrthographicCamera, PerspectiveCamera, Plane, PlaneGeometry, Quaternion, Scene, ShaderMaterial, Vector2, Vector3, WebGLRenderTarget } from "three";

import { CameraControllerTransform, frame_transforms } from "./SpectatorCameraController";

import {Layer} from "./layers";


export interface MixedRealityCameraControllerProps {
    first_person_transform?: CameraControllerTransform;
    third_person_transform?: CameraControllerTransform;
    first_person_horizontal_fov?: number;
    third_person_horizontal_fov?: number;
}

const fragment_depth_to_alpha = `uniform sampler2D tDepth;
varying vec2 vUv;

void main() {
    float depth = texture2D(tDepth, vUv).r;

    // use smoothstep to create a soft, anti-aliased edge at the transition between player and background.
    float alpha = 1.0 - smoothstep(0.95, 1.0, depth);
    
    gl_FragColor = vec4(vec3(0.0), alpha); 
}`;

const vertex_passthrough = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

export const MixedRealityCameraController = ({
    first_person_transform = frame_transforms.first_person(),
    third_person_transform = frame_transforms.third_person({
        position_ref: { current: new Vector3(2, 0.75, 2) },
        quaternion_ref: { current: new Quaternion(0, 0, 0, 1) }
    }),
    first_person_horizontal_fov = 50,
    third_person_horizontal_fov = 50
}: MixedRealityCameraControllerProps) => {
    const { scene, size } = useThree();

    const first_person_camera = useMemo(() => {
        return new PerspectiveCamera(50, 16 / 9, 0.1, 1000);
    }, []);

    useEffect(() => {
        const vertical_fov = 2 * Math.atan(Math.tan((first_person_horizontal_fov * Math.PI / 180) / 2) * (size.height / size.width)) * (180 / Math.PI);
        first_person_camera.fov = vertical_fov;
        first_person_camera.updateProjectionMatrix();
    }, [first_person_horizontal_fov, first_person_camera]);

    const third_person_camera = useMemo(() => {
        return new PerspectiveCamera(50, 16 / 9, 0.1, 1000);
    }, []);

    useEffect(() => {
        const vertical_fov = 2 * Math.atan(Math.tan((third_person_horizontal_fov * Math.PI / 180) / 2) * (size.height / size.width)) * (180 / Math.PI);
        third_person_camera.fov = vertical_fov;
        third_person_camera.updateProjectionMatrix();
    }, [third_person_horizontal_fov, third_person_camera]);

    // update aspects when size changes (dont destroy cameras on resize!)
    useEffect(() => {
        first_person_camera.aspect = size.width / size.height;
        first_person_camera.updateProjectionMatrix();

        third_person_camera.aspect = size.width / size.height;
        third_person_camera.updateProjectionMatrix();
    }, [size.width, size.height, first_person_camera, third_person_camera]);

    // opt into player model hands on first person camera, but no player model on third person camera (as their real world camera feed will be used instead)
    useEffect(() => {
        first_person_camera.layers.enable(Layer.PlayerModel_TorsoAndHands);
        first_person_camera.layers.enable(Layer.ThirdPerson_ForceHide);
    }, [first_person_camera]);

    const compositor_camera = useMemo(() => {
        const cam = new OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
        cam.position.z = 1; // quad at z=0 is now at depth 1, within [0.1, 10]
        return cam;
    }, []);


    const clipping_plane = useMemo(() => {
        return new Plane(new Vector3(0, 0, -1), 0.1);
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

    useEffect(() => {
        scene.add(player_capsule_mesh);
        player_capsule_mesh.layers.set(Layer.MR_PlayerCapsule);

        return () => {
            scene.remove(player_capsule_mesh);
        };
    }, [scene, player_capsule_mesh]);

    const foreground_render_target = useMemo(() => {
        const rt = new WebGLRenderTarget(1, 1);
        rt.depthTexture = new DepthTexture(1, 1);
        return rt;
    }, []);
    useEffect(() => {
        foreground_render_target.setSize(size.width, size.height);
    }, [foreground_render_target, size.width, size.height]);

    const blit_material = useMemo(
        () => new MeshBasicMaterial({ map: null, depthTest: false }),
        []
    );

    const alpha_mask_material = useMemo(() => {
        return new ShaderMaterial({
            fragmentShader: fragment_depth_to_alpha,
            vertexShader: vertex_passthrough,
            uniforms: {
                tDepth: { value: null }
            },
            transparent: true,
            depthTest: false,
            depthWrite: false
        });
    }, []);

    useEffect(() => {
        blit_material.map = foreground_render_target.texture;
        blit_material.needsUpdate = true;
        alpha_mask_material.uniforms.tDepth.value = foreground_render_target.depthTexture;
        alpha_mask_material.needsUpdate = true;
    }, []);

    const compositor_scene = useMemo(() => new Scene(), []);
    const compositor_quad = useMemo<Mesh>(() => new Mesh(new PlaneGeometry(2, 2), blit_material), [blit_material]);

    useEffect(() => {
        compositor_scene.add(compositor_quad);

        return () => {
            compositor_scene.remove(compositor_quad);
            compositor_quad.geometry.dispose();
        };
    }, []);

    useEffect(() => {
        return () => {
            foreground_render_target.dispose();
            player_capsule_geometry.dispose();
            player_capsule_material.dispose();
            blit_material.dispose();
            alpha_mask_material.dispose();
        };
    }, []);

    const render_size = useMemo(() => new Vector2(), []);

    useFrame(({ gl, scene, camera }) => {
        gl.render(scene, camera);

        if (!gl.xr.isPresenting) {
            return;
        }

        gl.getDrawingBufferSize(render_size);
        const draw_width = render_size.x / gl.getPixelRatio();
        const draw_height = render_size.y / gl.getPixelRatio();

        const headset_camera = gl.xr.getCamera();
        first_person_transform({
            spec_camera: first_person_camera,
            headset_cameras: headset_camera,
            gl,
        });

        third_person_transform({
            spec_camera: third_person_camera,
            headset_cameras: headset_camera,
            gl,
        });

        const first_person_position = first_person_camera.position.clone();
        const first_person_quaternion = first_person_camera.quaternion.clone();
        const third_person_quaternion = third_person_camera.quaternion.clone();

        const xr_state = gl.xr.enabled;
        const render_target = gl.getRenderTarget();
        gl.xr.enabled = false;

        // set clipping plane, facing camera at position of vr headset
        const camera_forward = new Vector3(0, 0, -1).applyQuaternion(
            third_person_quaternion
        );
        clipping_plane.normal.copy(camera_forward).negate();
        clipping_plane.constant = camera_forward.dot(first_person_position);

        // place player capsule at headset position, to occlude the player from the third person camera
        player_capsule_mesh.position
            .copy(first_person_position)
            .addScaledVector(new Vector3(0, 1, 0), -0.7);
        player_capsule_mesh.quaternion.copy(first_person_quaternion);
        third_person_camera.layers.enable(Layer.MR_PlayerCapsule);

        // prepare to render foreground (with depth)
        gl.setScissorTest(false);
        gl.setViewport(0, 0, size.width, size.height);
        gl.setRenderTarget(foreground_render_target);
        gl.clear();

        // clip background at plane and render first pass
        gl.clippingPlanes = [clipping_plane];
        gl.render(scene, third_person_camera);

        // enable force foreground layer and render second pass over the first
        gl.clippingPlanes = [];
        third_person_camera.layers.set(Layer.MR_ForceForeground);

        // clear only depth between the passes
        const prev_autoclear = gl.autoClear;
        gl.autoClear = false;
        gl.clear(false, true, false);
        gl.render(scene, third_person_camera);
        gl.autoClear = prev_autoclear;

        third_person_camera.layers.set(Layer.Default);
        gl.setRenderTarget(null);

        // composite into 4 tile (unity style) MR output
        // TL: foreground
        // TR: alpha mask
        // BL: third person camera feed
        // BR: first person camera feed

        // use scissor and viewport to render each quadrant
        const draw_quadrant = (
            target_scene: Scene,
            cam: PerspectiveCamera | OrthographicCamera,
            x: number,
            y: number
        ) => {
            gl.setViewport(x, y, draw_width / 2, draw_height / 2);
            gl.setScissor(x, y, draw_width / 2, draw_height / 2);
            gl.setScissorTest(true);
            gl.render(target_scene, cam);
        };

        gl.setScissorTest(false);
        gl.setViewport(0, 0, draw_width, draw_height);
        gl.clear();

        // TL: foreground
        compositor_quad.material = blit_material;
        draw_quadrant(compositor_scene, compositor_camera, 0, draw_height / 2);

        // TR: alpha mask
        compositor_quad.material = alpha_mask_material;
        draw_quadrant(
            compositor_scene,
            compositor_camera,
            draw_width / 2,
            draw_height / 2
        );

        // BL: third person camera feed
        draw_quadrant(scene, third_person_camera, 0, 0);

        // BR: first person camera feed
        draw_quadrant(scene, first_person_camera, draw_width / 2, 0);

        // restore xr rendering state
        gl.setScissorTest(false);
        gl.setViewport(0, 0, draw_width, draw_height);
        gl.setRenderTarget(render_target);
        gl.xr.enabled = xr_state;
    }, 1);

    return null;
};
