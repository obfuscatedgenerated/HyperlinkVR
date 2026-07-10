import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { Euler, Group, Matrix4, Object3D, Quaternion, Vector3 } from "three";
import {
    make_button_state,
    update_button_state,
    useSetHands,
    type Hand,
    type HandPose
} from "../../hands";
import { useFlatFrameInput } from "./bindings";

// carry slot: where held objects and the visible active hand sit, in camera space
const CARRY_OFFSET: [number, number, number] = [0.25, -0.25, -0.5];

const PASSIVE_HAND_OFFSET = new Vector3(-0.22, -0.35, -0.45); // left, down, forward of the head
const PASSIVE_HAND_REST_EULER = new Euler(-Math.PI / 6, 0.15, Math.PI / 12); // wrist tilt so the watch faces up-ish

const UNIT_SCALE = new Vector3(1, 1, 1);
const scratch_world_matrix = new Matrix4();

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
    const flat_input = useFlatFrameInput();

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

    const passive_grip = useRef<Group>(null);
    const passive_ray = useRef<Object3D | null>(null); // stays null forever
    const passive_pose = useRef<HandPose>({ kind: "curl", amount: 0.15 });
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

    useEffect(() => {
        set_hands(prev => [...prev, active_hand, passive_hand]);

        return () => {
            set_hands(prev => prev.filter(h => h !== active_hand && h !== passive_hand));
        };
    }, [active_hand, passive_hand, set_hands]);

    const scratch = useMemo(
        () => ({
            camera_world_position: new Vector3(),
            camera_world_quaternion: new Quaternion(),
            carry_world_position: new Vector3(),
            camera_yaw_euler: new Euler(0, 0, 0, "YXZ"),
            passive_yaw_quat: new Quaternion(),
            passive_rest_quat: new Quaternion(),
            passive_world_position: new Vector3(),
            passive_world_quaternion: new Quaternion()
        }),
        []
    );

    useFrame(() => {
        camera.getWorldPosition(scratch.camera_world_position);
        camera.getWorldQuaternion(scratch.camera_world_quaternion);

        // crosshair ray
        if (active_ray.current) {
            write_world_transform(
                active_ray.current,
                scratch.camera_world_position,
                scratch.camera_world_quaternion
            );
        }

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

        // passive left hand follows camera yaw and tips a little
        if (passive_grip.current) {
            scratch.camera_yaw_euler.setFromQuaternion(
                scratch.camera_world_quaternion,
                "YXZ"
            );
            scratch.camera_yaw_euler.x = 0;
            scratch.camera_yaw_euler.z = 0;
            scratch.passive_yaw_quat.setFromEuler(scratch.camera_yaw_euler);

            scratch.passive_world_position
                .copy(PASSIVE_HAND_OFFSET)
                .applyQuaternion(scratch.passive_yaw_quat)
                .add(scratch.camera_world_position);

            scratch.passive_rest_quat.setFromEuler(PASSIVE_HAND_REST_EULER);
            scratch.passive_world_quaternion
                .copy(scratch.passive_yaw_quat)
                .multiply(scratch.passive_rest_quat);

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
        // TODO: differentiate grab and point pose. vr should grab pose too
    });

    return (
        <>
            <group ref={active_grip} />
            <group ref={active_ray} />
            <group ref={passive_grip} />
        </>
    );
};
