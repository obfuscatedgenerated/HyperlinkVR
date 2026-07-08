import type { Collider } from "@hyperlinkvr/vr-engine-schemas";
import { CollisionPayload, RigidBody } from "@react-three/rapier";
import type { ComponentProps } from "react";

import { useCollider } from "../engine/ObjectPhysics";

interface TriggerVolumeProps extends ComponentProps<"group"> {
    collider: Collider;
    on_enter?: (payload: CollisionPayload) => void;
    on_exit?: (payload: CollisionPayload) => void;
}

export const TriggerVolume = ({collider, on_enter, on_exit, children, ...rest}: TriggerVolumeProps) => {
    const { auto_strategy, ColliderComponent } = useCollider(collider);

    return (
        <RigidBody
            // @ts-ignore
            type="fixed"
            sensor
            onIntersectionEnter={on_enter}
            onIntersectionExit={on_exit}
            colliders={auto_strategy}
            {...rest}
        >
            {ColliderComponent && <ColliderComponent />}
            {children}
        </RigidBody>
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
