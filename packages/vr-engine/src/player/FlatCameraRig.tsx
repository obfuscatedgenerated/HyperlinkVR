import { useSetting } from "@hyperlinkvr/react";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Euler, Group, Vector3 } from "three";

import { useFlatFrameInput } from "../input/impl/flat/bindings";


const SENSITIVITY = 0.0022; // rad per pixel TODO: configurable
const PITCH_LIMIT = Math.PI / 2 - 0.01;

export const FlatCameraRig = ({ origin }: { origin: React.RefObject<Group | null>; }) => {
    const { camera } = useThree();
    const input = useFlatFrameInput();

    const yaw = useRef(0);
    const pitch = useRef(0);
    const euler = useMemo(() => new Euler(0, 0, 0, "YXZ"), []);
    const head = useMemo(() => new Vector3(), []);

    const [player_height_cm] = useSetting("player_height_cm");

    useFrame(() => {
        // consume accumulated mouse delta
        yaw.current -= input.look.x * SENSITIVITY;
        pitch.current -= input.look.y * SENSITIVITY;
        pitch.current = Math.max(
            -PITCH_LIMIT,
            Math.min(PITCH_LIMIT, pitch.current)
        );
        input.look.x = 0;
        input.look.y = 0;

        euler.set(pitch.current, yaw.current, 0);
        camera.quaternion.setFromEuler(euler);

        const o = origin.current;
        if (o) {
            o.getWorldPosition(head);
            head.y += (player_height_cm / 100) - 0.15;
            camera.position.copy(head);
        }
    });

    return null;
};
