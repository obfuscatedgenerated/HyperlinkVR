import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, type RefObject } from "react";
import { Group, Object3D } from "three";

import {
    make_button_state,
    update_button_state,
    usePublishHands,
    type Hand,
    type HandPose
} from "../../hands";
import { useFlatInput } from "./bindings";


const CARRY_OFFSET: [number, number, number] = [0.25, -0.25, -0.5]; // carry slot in camera space

export const FlatHandsPublisher = () => {
    const hands_ref = usePublishHands();
    const { camera } = useThree();
    const input = useFlatInput();

    const grip = useRef<Group>(null);
    const ray = useRef<Group>(null);
    const pose = useRef<HandPose>({ kind: "curl", amount: 0 });
    const grab = useMemo(make_button_state, []);
    const trigger = useMemo(make_button_state, []);

    const hand = useMemo<Hand>(
        () => ({
            handedness: "right",
            grip: grip as RefObject<Object3D | null>,
            ray: ray as RefObject<Object3D | null>,
            grab,
            trigger,
            pose
        }),
        [grab, trigger]
    );

    useFrame(() => {
        if (ray.current) {
            camera.getWorldPosition(ray.current.position);
            camera.getWorldQuaternion(ray.current.quaternion);
            ray.current.updateMatrixWorld();
        }
        if (grip.current) {
            grip.current.position.set(...CARRY_OFFSET).applyMatrix4(camera.matrixWorld);
            grip.current.quaternion.copy(camera.quaternion);
            grip.current.updateMatrixWorld();
        }
        update_button_state(grab, input.grab);
        update_button_state(trigger, input.use);
        pose.current = { kind: "curl", amount: grab.pressed ? 1.2 : 0 };

        hands_ref.current = [hand];
    });

    return (
        <>
            <group ref={grip} />
            <group ref={ray} />
        </>
    );
};
