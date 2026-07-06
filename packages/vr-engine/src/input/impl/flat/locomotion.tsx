import { useFrame, useThree } from "@react-three/fiber";
import { RefObject, useMemo } from "react";
import { Group, Vector3 } from "three";

import { useFlatInput } from "./bindings";


const SPEED = 3; // m/s TODO: ensure matches vr speed
export const FlatLocomotion = ({ origin }: { origin: RefObject<Group | null> }) => {
    const { camera } = useThree();
    const input = useFlatInput();
    const fwd = useMemo(() => new Vector3(), []);
    const right = useMemo(() => new Vector3(), []);

    useFrame((_s, delta) => {
        const o = origin.current;
        if (!o || (input.move.x === 0 && input.move.y === 0)) return;
        camera.getWorldDirection(fwd);
        fwd.y = 0;
        fwd.normalize();
        right.crossVectors(fwd, o.up).normalize();
        o.position
            .addScaledVector(fwd, input.move.y * SPEED * delta)
            .addScaledVector(right, input.move.x * SPEED * delta);
    });
    return null;
};
