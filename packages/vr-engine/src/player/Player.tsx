import { SpectatorCamera } from "../misc";
import { useXRControllerLocomotion, XROrigin } from "@react-three/xr";
import { Avatar } from "./Avatar";
import { WristWatch } from "./WristWatch";
import { useRef } from "react";
import { Group } from "three";

export const Player = () => {
    const origin_ref = useRef<Group>(null);
    useXRControllerLocomotion(origin_ref);

    return (
        <group name="Player">
            <XROrigin ref={origin_ref}>
                <WristWatch />

                <SpectatorCamera />
            </XROrigin>
            <Avatar />
        </group>
    );
}
