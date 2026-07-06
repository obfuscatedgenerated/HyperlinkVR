import { useXRControllerLocomotion } from "@react-three/xr";
import { RefObject } from "react";
import { Group } from "three";

export const XRLocomotion = ({ origin }: { origin: RefObject<Group | null> }) => {
    useXRControllerLocomotion(origin);
    return null;
};
