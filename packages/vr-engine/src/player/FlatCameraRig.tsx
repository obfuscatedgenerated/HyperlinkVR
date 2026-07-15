import { useSetting } from "@hyperlinkvr/react";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Euler, Group, Vector3 } from "three";

import { useFlatFrameInput } from "../input/impl/flat/bindings";


const BASE_YAW_RADIANS = 0.022 * (Math.PI / 180);

const PITCH_LIMIT = Math.PI / 2 - 0.01;

const TURN_FRAME_LIMIT = Math.PI / 3;

export const FlatCameraRig = ({ origin }: { origin: React.RefObject<Group | null>; }) => {
    const { camera } = useThree();
    const input = useFlatFrameInput();

    const pitch = useRef(0);
    const head = useMemo(() => new Vector3(), []);

    const [player_height_cm] = useSetting("player_height_cm");
    const [sensitivity] = useSetting("flat_sensitivity");

    useFrame(() => {
        if (!origin.current) return;

        const mult = BASE_YAW_RADIANS * sensitivity;

        let yaw_delta = input.look.x * mult;
        if (Math.abs(yaw_delta) > TURN_FRAME_LIMIT) {
            yaw_delta = Math.sign(yaw_delta) * TURN_FRAME_LIMIT;
        }

        let pitch_delta = input.look.y * mult;
        if (Math.abs(pitch_delta) > TURN_FRAME_LIMIT) {
            pitch_delta = Math.sign(pitch_delta) * TURN_FRAME_LIMIT;
        }

        // apply accumulated x delta to the origin's yaw
        origin.current.rotation.y -= yaw_delta;
        input.look.x = 0;

        // apply accumulated y delta to the camera's pitch
        pitch.current -= pitch_delta;
        pitch.current = Math.max(
            -PITCH_LIMIT,
            Math.min(PITCH_LIMIT, pitch.current)
        );
        input.look.y = 0;

        // still need to apply the yaw to the camera as it isn't a child of the origin
        camera.rotation.set(pitch.current, origin.current.rotation.y, 0, "YXZ");

        origin.current.getWorldPosition(head);
        head.y += (player_height_cm / 100) - 0.15;
        camera.position.copy(head);
    });

    return null;
};
