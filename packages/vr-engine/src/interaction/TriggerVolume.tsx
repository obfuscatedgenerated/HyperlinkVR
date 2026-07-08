import type { Collider } from "@hyperlinkvr/vr-engine-schemas";
import {
    CollisionPayload,
    RapierRigidBody,
    RigidBody,
} from "@react-three/rapier";
import { ComponentProps, useRef } from "react";
import { Group } from "three";



import { useCollider, useKinematicPosition } from "../engine/ObjectPhysics";


interface TriggerVolumeProps extends ComponentProps<"group"> {
    collider: Collider;
    on_enter?: (payload: CollisionPayload) => void;
    on_exit?: (payload: CollisionPayload) => void;
    anchor_ref?: React.RefObject<Group | null>;
}

const ALL_COLLISIONS = 60943;

export const TriggerVolume = ({collider, on_enter, on_exit, anchor_ref, children, ...rest}: TriggerVolumeProps) => {
    const { auto_strategy, ColliderComponent } = useCollider(collider);
    const container_ref = useRef<Group>(null);
    const rb_ref = useRef<RapierRigidBody>(null);

    useKinematicPosition(rb_ref, { type: "kinematic-pos" }, anchor_ref || container_ref);

    return (
        <group {...rest}>
            <RigidBody
                ref={rb_ref}
                // @ts-ignore
                type="kinematicPosition"
                sensor
                onIntersectionEnter={on_enter}
                onIntersectionExit={on_exit}
                activeCollisionTypes={ALL_COLLISIONS}
                colliders={auto_strategy}
            >
                {ColliderComponent && <ColliderComponent />}
                {children}
            </RigidBody>
        </group>
    )
}

export const resolve_body_part = (payload: CollisionPayload): "hand" | "torso" | "head" | null => {
    const name = payload.other.rigidBodyObject?.name ?? "";
    if (!name) return null;

    if (name.startsWith("avatar_head_rb")) return "head";
    if (name.startsWith("avatar_torso_rb")) return "torso";
    if (name.startsWith("avatar_hand_rb")) return "hand";

    return null;
}
