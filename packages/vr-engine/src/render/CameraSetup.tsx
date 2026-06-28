import { useThree } from "@react-three/fiber";
import { useEffect } from "react";



import { compute_layer_mask, Layer } from "./layers";


const layer_mask = compute_layer_mask([
    Layer.Default,
    Layer.PlayerModel_TorsoAndHands,
    Layer.ThirdPerson_ForceHide
]);

export const CameraSetup = () => {
    const { gl } = useThree();

    useEffect(() => {
        const set_layers = () => {
            const xr_camera = gl.xr.getCamera();
            xr_camera.layers.mask = layer_mask;
        };

        // set immediately in case remounted in vr, but listen for sessionstart to cover both cameras when vr starts
        set_layers();
        gl.xr.addEventListener("sessionstart", set_layers);

        return () => {
            gl.xr.removeEventListener("sessionstart", set_layers);
        };
    }, [gl, layer_mask]);

    return null;
}
