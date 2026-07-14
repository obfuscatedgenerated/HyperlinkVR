import { useFrame, useThree } from "@react-three/fiber";
import {RapierCollider, useRapier} from "@react-three/rapier";
import {RefObject, useCallback, useEffect, useMemo, useRef} from "react";
import { Vector3 } from "three";
import {usePlayerOrigin} from "../contexts";
import {useSetting} from "@hyperlinkvr/react";
import {useXRInputSourceState} from "@react-three/xr";
import {useFlatFrameInput} from "../input/impl/flat/bindings";
import {useSessionMode} from "../contexts/SessionModeContext";
import {JUMP_SPEED} from "../input/values";
import {useWorldEnvironment} from "../world/WorldEnvironmentContext";
import {consume_player_movement} from "./motion";

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


const MIN_PLAYER_HEIGHT = 0.6;   // crouched / seated floor
const MAX_PLAYER_HEIGHT = 2.2;   // sanity ceiling (bad tracking, standing on a chair)
const CAPSULE_RADIUS = 0.3;
const HEAD_CLEARANCE = 0.1;      // eyes aren't at the crown of your head

const MAX_STEP_HEIGHT = 0.3;
const MIN_STEP_WIDTH = 0.2;
const SNAP_TO_GROUND_DISTANCE = 0.3;
const MAX_SLOPE_CLIMB_ANGLE = (50 * Math.PI) / 180;
const MIN_SLOPE_SLIDE_ANGLE = (35 * Math.PI) / 180;

export const PlayerKinematics = () => {
    const origin_ref = usePlayerOrigin();
    const { world, rapier, rigidBodyStates } = useRapier();
    const { camera } = useThree();

    const velocity_y = useRef(0);
    const jump_pressed_ref = useRef(false);

    const head_world = useRef(new Vector3());
    const desired = useRef(new Vector3());
    const requested = useRef(new Vector3());

    const { world_env } = useWorldEnvironment();

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

    // kinematic capsule teleported to the player each frame and ask rapier where it's allowed to end up
    const { controller, capsule_body, capsule_collider } = useMemo(() => {
        const character_controller = world.createCharacterController(0.01);

        character_controller.enableAutostep(MAX_STEP_HEIGHT, MIN_STEP_WIDTH, true);
        character_controller.enableSnapToGround(SNAP_TO_GROUND_DISTANCE);
        character_controller.setMaxSlopeClimbAngle(MAX_SLOPE_CLIMB_ANGLE);
        character_controller.setMinSlopeSlideAngle(MIN_SLOPE_SLIDE_ANGLE);
        character_controller.setApplyImpulsesToDynamicBodies(true);

        const body = world.createRigidBody(
            rapier.RigidBodyDesc.kinematicPositionBased()
        );

        const collider = world.createCollider(
            rapier.ColliderDesc.capsule(1, CAPSULE_RADIUS),
            body
        );

        return {
            controller: character_controller,
            capsule_body: body,
            capsule_collider: collider
        };
    }, [world, rapier]);

    useEffect(() => {
        return () => {
            world.removeCollider(capsule_collider, false);
            world.removeRigidBody(capsule_body);
            world.removeCharacterController(controller);
        };
    }, [world, controller, capsule_body, capsule_collider]);

    useFrame((_, delta) => {
        const origin = origin_ref.current;
        if (!origin) return;

        camera.getWorldPosition(head_world.current);

        // scale the capsule to the player's current head height (so they can crouch under stuff)
        const head_height = head_world.current.y - origin.position.y + HEAD_CLEARANCE;
        const player_height = Math.min(
            MAX_PLAYER_HEIGHT,
            Math.max(MIN_PLAYER_HEIGHT, head_height)
        );

        const capsule_half_height = Math.max(
            0.05,
            player_height / 2 - CAPSULE_RADIUS
        );
        capsule_collider.setHalfHeight(capsule_half_height);

        // the capsule stands under the head, not under the origin
        // in roomscale vr the player can physically walk away from the origin point
        const capsule_centre_y = origin.position.y + capsule_half_height + CAPSULE_RADIUS;

        capsule_body.setNextKinematicTranslation({
            x: head_world.current.x,
            y: capsule_centre_y,
            z: head_world.current.z
        });
        capsule_body.setTranslation(
            { x: head_world.current.x, y: capsule_centre_y, z: head_world.current.z },
            true
        );

        velocity_y.current += world_env.physics.gravity * delta;

        if (jump_pressed_ref.current && controller.computedGrounded()) {
            velocity_y.current = JUMP_SPEED;
        }

        consume_player_movement(requested.current);

        desired.current.set(
            requested.current.x,
            velocity_y.current * delta,
            requested.current.z
        );

        controller.computeColliderMovement(
            capsule_collider,
            desired.current,
            undefined,
            undefined,
            should_hit_environment
        );

        const resolved = controller.computedMovement();

        if (controller.computedGrounded()) {
            velocity_y.current = 0;
        }

        origin.position.x += resolved.x;
        origin.position.y += resolved.y;
        origin.position.z += resolved.z;
    });

    const mode = useSessionMode();
    return mode === "vr" ? (
        <VRJumpButton jump_pressed_ref={jump_pressed_ref} />
    ) : (
        <FlatJumpButton jump_pressed_ref={jump_pressed_ref} />
    );
};
