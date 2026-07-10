import { useFrame, useThree } from "@react-three/fiber";
import {RapierCollider, useRapier} from "@react-three/rapier";
import {RefObject, useCallback, useMemo, useRef} from "react";
import { Vector3 } from "three";
import {usePlayerOrigin} from "../contexts";
import {useSetting} from "@hyperlinkvr/react";
import {useXRInputSourceState} from "@react-three/xr";
import {useFlatFrameInput} from "../input/impl/flat/bindings";
import {useSessionMode} from "../contexts/SessionModeContext";
import {JUMP_SPEED} from "../input/values";

// 0.5 meters (roughly knee height) ensures we don't start the raycast inside the floor
const RAY_START_HEIGHT = 0.5;

// TODO: sync gravity with rapier gravity for if we allow it to change later (either shared hook or reading from rapier)
const GRAVITY = -9.81;

const VRJumpButton = ({jump_pressed_ref}: {jump_pressed_ref: RefObject<boolean>}) => {
    const [locomotion_hand] = useSetting("vr_locomotion_hand");
    const jump_hand = useMemo(() => locomotion_hand === "left" ? "right" : "left", [locomotion_hand]);

    const state = useXRInputSourceState("controller", jump_hand);

    useFrame(() => {
        if (!state) {
            jump_pressed_ref.current = false;
            return;
        }

        const jump_pressed = state.gamepad["a-button"]?.state === "pressed";
        jump_pressed_ref.current = jump_pressed;
    });

    return null;
}

const FlatJumpButton = ({jump_pressed_ref}: {jump_pressed_ref: RefObject<boolean>}) => {
    const input = useFlatFrameInput();

    useFrame(() => {
        jump_pressed_ref.current = input.jump;
    });

    return null;
}

// TODO: is it worth having a binding thingy for XR then reading in an abstract way? then again this seems to be the only place its needed for now

export const PlayerGravity = () => {
    const origin_ref = usePlayerOrigin();

    const { world, rapier, rigidBodyStates } = useRapier();
    const { camera } = useThree();
    const velocity_y = useRef(0);

    const ray_origin = useRef(new Vector3());
    const ray_direction = useRef(new Vector3(0, -1, 0));

    const jump_pressed_ref = useRef(false);

    const should_hit_environment = useCallback(
        (collider: RapierCollider): boolean => {
            const body = collider.parent();
            if (!body) return true;

            const name = rigidBodyStates.get(body.handle)?.object.name ?? "";

            const is_player_part =
                name.startsWith("avatar_head_rb") ||
                name.startsWith("avatar_torso_rb") ||
                name.startsWith("avatar_hand_rb");

            return !is_player_part;
        },
        [rigidBodyStates]
    );


    useFrame((_, delta) => {
        if (!origin_ref.current) return;

        velocity_y.current += GRAVITY * delta;

        // cast from the players current head x/z, but from knee height y
        ray_origin.current.set(
            camera.position.x,
            origin_ref.current.position.y + RAY_START_HEIGHT,
            camera.position.z
        );

        const ray = new rapier.Ray(ray_origin.current, ray_direction.current);

        const hit = world.castRay(
            ray,
            10.0,
            true,
            undefined, // filterFlags
            undefined, // filterGroups
            undefined, // filterExcludeCollider
            undefined, // filterExcludeRigidBody
            should_hit_environment
        );

        if (hit && hit.timeOfImpact <= RAY_START_HEIGHT) {
            if (jump_pressed_ref.current) {
                // apply jump force while grounded
                velocity_y.current = JUMP_SPEED;
                origin_ref.current.position.y += velocity_y.current * delta;
                return;
            }

            // hit the floor
            velocity_y.current = 0;

            // snap origin exactly to the floor
            origin_ref.current.position.y = ray_origin.current.y - hit.timeOfImpact;
        } else {
            // falling (or about to fall)
            origin_ref.current.position.y += velocity_y.current * delta;
        }
    });

    const mode = useSessionMode();
    return mode === "vr" ? <VRJumpButton jump_pressed_ref={jump_pressed_ref} /> : <FlatJumpButton jump_pressed_ref={jump_pressed_ref} />;
};
