import {useThree} from "@react-three/fiber";
import {useEffect} from "react";

import {compute_layer_mask, Layer} from "./layers";
import {get_united_head_camera} from "../util/get_head_cameras";


const layer_mask = compute_layer_mask([
    Layer.Default,
    Layer.PlayerModel_TorsoAndHands,
    Layer.ThirdPerson_ForceHide,
    Layer.Vignette
]);

export const CameraSetup = () => {
    const { gl, camera } = useThree();

    useEffect(() => {
        const set_layers = () => {
            get_united_head_camera(gl, camera).layers.mask = layer_mask;
        };

        // set immediately in case remounted in vr, but listen for sessionstart to cover both cameras when vr starts
        // for flat, this will never matter so can safely set the listeners
        set_layers();
        gl.xr.addEventListener("sessionstart", set_layers);

        return () => {
            gl.xr.removeEventListener("sessionstart", set_layers);
        };
    }, [gl, layer_mask]);

    return null;
}
