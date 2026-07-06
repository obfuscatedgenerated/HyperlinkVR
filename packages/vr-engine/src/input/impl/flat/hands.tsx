import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { Group, Matrix4, Object3D, Quaternion, Vector3 } from "three";

import { usePlayerOrigin } from "../../../contexts";
import {
    make_button_state,
    update_button_state,
    useSetHands,
    type Hand,
    type HandPose
} from "../../hands";
import { useFlatInput } from "./bindings";

// carry slot: where held objects and the visible hand sit, in camera space
const CARRY_OFFSET: [number, number, number] = [0.25, -0.25, -0.5];

// resting pose for the cosmetic left hand, in ORIGIN space (not camera space,
// so it hangs at the hip instead of floating in front of the face)
const PASSIVE_HAND_OFFSET: [number, number, number] = [-0.25, 0.9, -0.15];

const UNIT_SCALE = new Vector3(1, 1, 1);
const scratch_world_matrix = new Matrix4();

// writes a WORLD transform onto a node regardless of where it's parented,
// so mounting the publisher under the origin can't double-apply the origin.
const write_world_transform = (
    node: Object3D,
    world_position: Vector3,
    world_quaternion: Quaternion
) => {
    node.matrixAutoUpdate = false;
    scratch_world_matrix.compose(world_position, world_quaternion, UNIT_SCALE);
    if (node.parent) {
        node.parent.updateWorldMatrix(true, false);
        node.matrix
            .copy(node.parent.matrixWorld)
            .invert()
            .multiply(scratch_world_matrix);
    } else {
        node.matrix.copy(scratch_world_matrix);
    }
    node.matrixWorldNeedsUpdate = true;
    node.updateWorldMatrix(false, false);
};

export const FlatHandsPublisher = () => {
    const set_hands = useSetHands();
    const { camera } = useThree();
    const flat_input = useFlatInput();
    const origin_ref = usePlayerOrigin();

    // ---- active right hand: camera ray + carry slot + real buttons ----
    const active_grip = useRef<Group>(null);
    const active_ray = useRef<Group>(null);
    const active_pose = useRef<HandPose>({ kind: "curl", amount: 0 });
    const active_grab = useMemo(make_button_state, []);
    const active_trigger = useMemo(make_button_state, []);

    const active_hand = useMemo<Hand>(
        () => ({
            handedness: "right",
            grip: active_grip as RefObject<Object3D | null>,
            ray: active_ray as RefObject<Object3D | null>,
            grab: active_grab,
            trigger: active_trigger,
            pose: active_pose
        }),
        [active_grab, active_trigger]
    );

    // ---- passive left hand: cosmetic only. no ray, buttons never update ----
    const passive_grip = useRef<Group>(null);
    const passive_ray = useRef<Object3D | null>(null); // stays null forever
    const passive_pose = useRef<HandPose>({ kind: "curl", amount: 0.2 });
    const passive_grab = useMemo(make_button_state, []);
    const passive_trigger = useMemo(make_button_state, []);

    const passive_hand = useMemo<Hand>(
        () => ({
            handedness: "left",
            grip: passive_grip as RefObject<Object3D | null>,
            ray: passive_ray,
            grab: passive_grab,
            trigger: passive_trigger,
            pose: passive_pose
        }),
        [passive_grab, passive_trigger]
    );

    // publish on mount / hand identity change — a state update, so render-time
    // consumers (FlatAvatarHands, the watch) actually re-render when hands exist
    useEffect(() => {
        set_hands([active_hand, passive_hand]);
        return () => set_hands([]);
    }, [active_hand, passive_hand, set_hands]);

    const scratch = useMemo(
        () => ({
            camera_world_position: new Vector3(),
            camera_world_quaternion: new Quaternion(),
            carry_world_position: new Vector3(),
            passive_world_position: new Vector3(),
            passive_world_quaternion: new Quaternion()
        }),
        []
    );

    useFrame(() => {
        camera.getWorldPosition(scratch.camera_world_position);
        camera.getWorldQuaternion(scratch.camera_world_quaternion);

        // ray: from the eye, along the look direction (the crosshair IS the ray).
        // kept as a node so Grabbable's ray-grab can raycast along it, even
        // though UI clicking uses R3F's built-in camera events, not this.
        if (active_ray.current) {
            write_world_transform(
                active_ray.current,
                scratch.camera_world_position,
                scratch.camera_world_quaternion
            );
        }

        // grip: the carry slot, a fixed offset in front of the camera
        if (active_grip.current) {
            scratch.carry_world_position
                .set(...CARRY_OFFSET)
                .applyMatrix4(camera.matrixWorld);
            write_world_transform(
                active_grip.current,
                scratch.carry_world_position,
                scratch.camera_world_quaternion
            );
        }

        // passive left: resting pose in origin space, so it walks with the
        // player but doesn't swing with the view
        if (passive_grip.current && origin_ref?.current) {
            origin_ref.current.updateWorldMatrix(true, false);
            scratch.passive_world_position
                .set(...PASSIVE_HAND_OFFSET)
                .applyMatrix4(origin_ref.current.matrixWorld);
            origin_ref.current.getWorldQuaternion(
                scratch.passive_world_quaternion
            );
            write_world_transform(
                passive_grip.current,
                scratch.passive_world_position,
                scratch.passive_world_quaternion
            );
        }

        update_button_state(active_grab, flat_input.grab);
        update_button_state(active_trigger, flat_input.use);
        active_pose.current = {
            kind: "curl",
            amount: active_grab.pressed ? 1.2 : 0
        };
        // passive hand: buttons deliberately never updated, pose stays relaxed
    });

    return (
        <>
            <group ref={active_grip} />
            <group ref={active_ray} />
            <group ref={passive_grip} />
        </>
    );
};

