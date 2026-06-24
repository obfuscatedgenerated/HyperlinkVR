import { useFrame, useThree } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";

export const SpectatorCameraController = () => {
    const { size } = useThree();

    // 1. Create a dedicated, clean camera specifically for the WebRTC stream
    const specCam = useMemo(() => {
        // Standard 75 FOV, normal 16:9 aspect ratio
        return new THREE.PerspectiveCamera(
            75,
            size.width / size.height,
            0.1,
            1000
        );
    }, [size.width, size.height]);

    useFrame(({ gl, scene, camera }) => {
        if (gl.xr.isPresenting) {
            // 1. Let WebXR render to the VR headset using the default pipeline
            gl.render(scene, camera);

            // 2. Grab the headset's left eye
            const xrCamera = gl.xr.getCamera();
            const leftEye = xrCamera.cameras[0] || xrCamera;

            // 3. THE FIX: ONLY copy position and rotation.
            // Do NOT copy the projection matrix to avoid the stereoscopic distortion!
            specCam.position.copy(leftEye.position);
            specCam.quaternion.copy(leftEye.quaternion);

            // 4. Temporarily disable VR and unbind the headset buffer
            const currentXrEnabled = gl.xr.enabled;
            const currentRenderTarget = gl.getRenderTarget();

            gl.xr.enabled = false;
            gl.setRenderTarget(null);
            gl.clear();

            // 5. Paint the HTML canvas using our clean, single-lens camera!
            gl.render(scene, specCam);

            // 6. Restore VR state
            gl.setRenderTarget(currentRenderTarget);
            gl.xr.enabled = currentXrEnabled;
        } else {
            gl.render(scene, camera);
        }
    }, 1);

    return null;
};
