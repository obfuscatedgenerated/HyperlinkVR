import {Collider, PhysicsSystem, RigidBody as RigidBodyConfig, Transform} from "@hyperlinkvr/vr-engine-schemas";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import {
    BallCollider, CapsuleCollider, CuboidCollider,
    CylinderCollider, MeshCollider, RapierRigidBody, RigidBody, RigidBodyAutoCollider
} from "@react-three/rapier";
import {ComponentProps, useEffect, useMemo, useRef} from "react";
import {Group, MeshBasicMaterial, Quaternion, Vector3, Mesh, EulerOrder, Euler} from "three";

import { clone } from "three/examples/jsm/utils/SkeletonUtils"

import { useObjectRefsOptional } from "../contexts/ObjectRefsContext";
import {rotation_to_euler, rotation_to_quaternion_array} from "./rotation";


const RB_TYPE = {
    fixed: "fixed",
    dynamic: "dynamic",
    "kinematic-pos": "kinematicPosition",
    "kinematic-vel": "kinematicVelocity"
} as const;

export const useKinematicPosition = (
    rb_ref: React.RefObject<RapierRigidBody | null>,
    rb: RigidBodyConfig,
    container_ref: React.RefObject<Group | null>
) => {
    const target_pos = useMemo(() => new Vector3(), []);
    const target_quat = useMemo(() => new Quaternion(), []);

    useFrame(() => {
        if (rb.type !== "kinematic-pos" || !rb_ref.current || !container_ref.current) {
            return;
        }

        // copy world transform of container to kinematic-pos rigid body
        //container_ref.current.updateWorldMatrix(true, false);

        container_ref.current.getWorldPosition(target_pos);
        container_ref.current.getWorldQuaternion(target_quat);

        rb_ref.current.setNextKinematicTranslation(target_pos);
        rb_ref.current.setNextKinematicRotation(target_quat);
    }, -1);
};

export const useKinematicVelocity = (
    ref: React.RefObject<RapierRigidBody | null>,
    rb: RigidBodyConfig
) => {
    useEffect(() => {
        if (rb.type !== "kinematic-vel" || !ref.current) return;
        ref.current.setLinvel(
            { x: rb.velocity[0], y: rb.velocity[1], z: rb.velocity[2] },
            true
        );
    }, [ref, rb]);
};

interface ColliderProps {
    position?: [number, number, number];
    rotation?: [number, number, number] | [number, number, number, EulerOrder];
}

export const PrimitiveCollider = ({ collider, ...rest }: ColliderProps & { collider: Collider }) => {
    switch (collider.type) {
        case "box":
            return (
                <CuboidCollider
                    args={[
                        collider.size[0] / 2,
                        collider.size[1] / 2,
                        collider.size[2] / 2
                    ]}
                    {...rest}
                />
            );
        case "sphere":
            return <BallCollider args={[collider.radius]} {...rest} />;
        case "capsule":
            return <CapsuleCollider args={[collider.height / 2, collider.radius]} {...rest} />;
        case "cylinder":
            return <CylinderCollider args={[collider.height / 2, collider.radius]} {...rest} />;
        default:
            return null;
    }
};

const INVISIBLE_MATERIAL = new MeshBasicMaterial({ visible: false });

export const URLMeshCollider = ({
    url,
    approximation,
    ...rest
}: ColliderProps & {
    url: string;
    approximation: string;
}) => {
    const { scene } = useGLTF(url);
    const instance = useMemo(() => {
        const cloned = clone(scene);

        cloned.traverse((object) => {
            const mesh = object as Mesh;
            if (mesh.isMesh) {
                mesh.material = INVISIBLE_MATERIAL;
            }
        });

        return cloned;
    }, [scene]);

    return (
        // TODO: fix typing
        <MeshCollider type={approximation as any} {...rest}>
            <primitive object={instance} />
        </MeshCollider>
    );
};

export const useCollider = (collider: Collider): {auto_strategy: RigidBodyAutoCollider | false, ColliderComponent: React.ComponentType<ColliderProps> | null} => {
    const auto_strategy = collider.type === "auto" ? (collider.approximation as any) : false;

    const ColliderComponent = useMemo(() => {
        switch (collider.type) {
            case "custom-mesh":
                return (props: ColliderProps) => <URLMeshCollider url={collider.mesh} approximation={collider.approximation || "hull"} {...props} />;
            case "box":
            case "sphere":
            case "capsule":
            case "cylinder":
                return (props: ColliderProps) => <PrimitiveCollider collider={collider} {...props} />;
            default:
                return null;
        }
    }, [collider]);

    return { auto_strategy, ColliderComponent };
}

const get_body_props = (rb: RigidBodyConfig): Partial<ComponentProps<typeof RigidBody>> => {
    const restituton_rules = {
        "average": 0,
        "min": 1,
        "multiply": 2,
        "max": 3
    }

    const base_props: Partial<ComponentProps<typeof RigidBody>> = {
        restitution: rb.restitution,
        restitutionCombineRule: rb.restitution_combine_rule ? restituton_rules[rb.restitution_combine_rule] : undefined,
        friction: rb.friction,
        linearDamping: rb.linear_damping,
        angularDamping: rb.angular_damping,
    };

    const strip_undefined = (obj: any) => {
        return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined));
    }

    if (rb.type === "dynamic") {
        const locked_axes = rb.locked_axes || { rotation: { x: false, y: false, z: false }, translation: { x: false, y: false, z: false } };

        return strip_undefined({
            ...base_props,
            linearVelocity: rb.velocity,
            angularVelocity: rb.angular_velocity,
            mass: rb.mass,
            gravityScale: rb.gravity_scale,
            ccd: rb.ccd,
            enabledRotations: [!locked_axes.rotation.x, !locked_axes.rotation.y, !locked_axes.rotation.z],
            enabledTranslations: [!locked_axes.translation.x, !locked_axes.translation.y, !locked_axes.translation.z],
        });
    } else if (rb.type === "kinematic-vel") {
        return strip_undefined({
            ...base_props,
            linearVelocity: rb.velocity,
            angularVelocity: rb.angular_velocity,
        });
    } else if (rb.type === "kinematic-pos" || rb.type === "fixed") {
        return strip_undefined(base_props);
    }

    return {};
}

export const ObjectPhysics = ({
    physics,
    children = null,
    body_name,
    kinematic_pos_tracking_ref,
    transform,
    collision_groups
}: {
    physics: PhysicsSystem;
    children?: React.ReactNode;
    body_name?: string;
    kinematic_pos_tracking_ref?: React.RefObject<Group | null>;
    transform?: Transform
    collision_groups?: number;
}) => {
    const refs = useObjectRefsOptional();

    const rb = physics.rigid_body ?? { type: "fixed" as const };

    const local_ref = useRef<RapierRigidBody>(null);
    const rb_ref = refs?.rigid_body || local_ref;

    const container_ref = useRef<Group>(null);

    const collider: Collider = rb.collider ?? {
        type: "auto",
        approximation: rb.type === "fixed" ? "trimesh" : "hull"
    };

    if (collider.type === "auto" && !children) {
        console.warn(`RigidBody "${body_name || "unnamed"}" has auto collider but no children to generate colliders from. This may result in no colliders being generated.`);
    }

    const { auto_strategy, ColliderComponent } = useCollider(collider);

    const collision_group_props = collision_groups !== undefined ? { collisionGroups: collision_groups } : {};

    useKinematicPosition(rb_ref, rb, kinematic_pos_tracking_ref || container_ref);
    useKinematicVelocity(rb_ref, rb);
    // usePhysicsReporting(rbRef, physics, monitors, id); // TODO: implement

    const collider_rot_euler = useMemo(() => {
        if (!collider.rotation) return [0, 0, 0] as [number, number, number];

        const euler = new Euler();
        rotation_to_euler(collider.rotation, euler);
        return [euler.x, euler.y, euler.z, euler.order] as [number, number, number, EulerOrder];
    }, [collider.rotation]);

    return (
        <group ref={container_ref}>
            <RigidBody
                ref={rb_ref}
                name={body_name}
                type={RB_TYPE[rb.type]}
                position={transform?.position}
                quaternion={transform ? rotation_to_quaternion_array(transform.rotation) : undefined}
                colliders={auto_strategy}
                {...collision_group_props}
                {...get_body_props(rb)}
                //onCollisionEnter={physics.report_collisions ? (e) => reportCollision(id, e) : undefined} // TODO: implement
            >
                {ColliderComponent && <ColliderComponent position={collider.offset} rotation={collider_rot_euler} />}
                {children}
            </RigidBody>
        </group>
    );
};

// TODO: option to ignore player collisions, and option to allow players to pass through objects
