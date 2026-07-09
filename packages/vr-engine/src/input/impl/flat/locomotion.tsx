import { useFrame, useThree } from "@react-three/fiber";
import { RefObject, useMemo } from "react";
import { Group, Vector3 } from "three";

import { useFlatFrameInput } from "./bindings";
import {WALK_SPEED} from "../../values";

export const FlatLocomotion = ({ origin }: { origin: RefObject<Group | null> }) => {
    const { camera } = useThree();
    const input = useFlatFrameInput();
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
            .addScaledVector(fwd, input.move.y * WALK_SPEED * delta)
            .addScaledVector(right, input.move.x * WALK_SPEED * delta);
    });
    return null;
};
