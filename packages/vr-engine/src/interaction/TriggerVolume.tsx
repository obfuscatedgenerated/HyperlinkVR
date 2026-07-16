import type {Collider, TriggerVolumeInteractionPayload} from "@hyperlinkvr/vr-engine-schemas";
import {
    CollisionPayload,
    RapierRigidBody,
    RigidBody,
} from "@react-three/rapier";
import {ComponentProps, useMemo, useRef} from "react";
import {Euler, EulerOrder, Group} from "three";



import { useCollider, useKinematicPosition } from "../engine/ObjectPhysics";
import {rotation_to_euler} from "../engine/rotation";


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

    const collider_rot_euler = useMemo(() => {
        if (!collider.rotation) return [0, 0, 0] as [number, number, number];

        const euler = new Euler();
        rotation_to_euler(collider.rotation, euler);
        return [euler.x, euler.y, euler.z, euler.order] as [number, number, number, EulerOrder];
    }, [collider.rotation]);

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
                {ColliderComponent && <ColliderComponent position={collider.offset} rotation={collider_rot_euler} />}
                {children}
            </RigidBody>
        </group>
    )
}

export const resolve_body_part = (payload: CollisionPayload): {part: "hand" | "torso" | "head" | null, handedness?: "left" | "right"} => {
    const name = payload.other.rigidBodyObject?.name ?? "";
    if (!name) return {part: null};

    if (name.startsWith("avatar_head_rb")) return {part: "head"};
    if (name.startsWith("avatar_torso_rb")) return {part: "torso"};

    if (name.startsWith("avatar_hand_rb")) {
        const handedness = name.includes("left") ? "left" : name.includes("right") ? "right" : null;
        if (handedness) {
            return {part: "hand", handedness};
        }
    }

    return {part: null};
}

interface MiniInteraction {
    ignore_hands?: boolean;
    ignore_head?: boolean;
    ignore_torso?: boolean;
    objects?: {
        include: boolean;
        tag_filter?: string[];
    }
}

export const resolve_interacted = (payload: CollisionPayload, config: MiniInteraction = {}): TriggerVolumeInteractionPayload["interacted"] | null => {
    const {part, handedness} = resolve_body_part(payload);

    if (part) {
        if (part === "hand" && config.ignore_hands) return null;
        if (part === "head" && config.ignore_head) return null;
        if (part === "torso" && config.ignore_torso) return null;

        if (part === "hand") {
            if (!handedness) {
                throw new Error("Handedness should be defined for hand part");
            }

            return {type: "player", part, handedness};
        } else {
            return {type: "player", part};
        }
    }

    if (config.objects && config.objects.include) {
        // TODO: more stable way to get the root object
        const rb_parent = payload.other.rigidBodyObject?.parent;
        if (!rb_parent) return null;
        const root = rb_parent.parent;
        if (!root) return null;

        const object_id = root.userData?.object_id as string | undefined;
        if (!object_id) return null;

        const object_tags = root.userData?.tags as string[] | undefined;
        if (!object_tags) return null;

        const filter = config.objects.tag_filter;
        if (filter) {
            const has_tag = filter.some(tag => object_tags.includes(tag));
            if (!has_tag) return null;
        }

        return {type: "object", object_id, tags: object_tags};
    }

    return null;
}
