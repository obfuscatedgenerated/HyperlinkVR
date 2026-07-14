import {Collider, PhysicsSystem, RigidBody as RigidBodyConfig, Transform} from "@hyperlinkvr/vr-engine-schemas";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { BallCollider, CapsuleCollider, CuboidCollider, MeshCollider, RapierRigidBody, RigidBody, RigidBodyAutoCollider } from "@react-three/rapier";
import { useEffect, useMemo, useRef } from "react";
import {Group, MeshBasicMaterial, Quaternion, Vector3, Mesh} from "three";

import { clone } from "three/examples/jsm/utils/SkeletonUtils"

import { useObjectRefsOptional } from "../contexts/ObjectRefsContext";
import {rotation_to_quaternion_array} from "./rotation";


const RB_TYPE = {
    fixed: "fixed",
    dynamic: "dynamic",
    "kinematic-pos": "kinematicPosition",
    "kinematic-vel": "kinematicVelocity"
} as const;

export const PrimitiveCollider = ({ collider }: { collider: Collider }) => {
    switch (collider.type) {
        case "box":
            return (
                <CuboidCollider
                    args={[
                        collider.size[0] / 2,
                        collider.size[1] / 2,
                        collider.size[2] / 2
                    ]}
                />
            );
        case "sphere":
            return <BallCollider args={[collider.radius]} />;
        case "capsule":
            return (
                <CapsuleCollider
                    args={[collider.height / 2, collider.radius]}
                />
            );
        default:
            return null;
    }
};

const INVISIBLE_MATERIAL = new MeshBasicMaterial({ visible: false });

export const URLMeshCollider = ({
    url,
    approximation
}: {
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
        <MeshCollider type={approximation as any}>
            <primitive object={instance} />
        </MeshCollider>
    );
};

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

export const useExplicitMass = (
    ref: React.RefObject<RapierRigidBody | null>,
    rb: RigidBodyConfig
) => {
    useEffect(() => {
        if (rb.type !== "dynamic" || !ref.current) return;
        ref.current.setAdditionalMass(rb.mass, true);
    }, [ref, rb]);
};

export const useCollider = (collider: Collider): {auto_strategy: RigidBodyAutoCollider | false, ColliderComponent: React.ComponentType<any> | null} => {
    const auto_strategy = collider.type === "auto" ? (collider.approximation as any) : false;

    const ColliderComponent = useMemo(() => {
        switch (collider.type) {
            case "custom-mesh":
                return () => <URLMeshCollider url={collider.mesh} approximation={collider.approximation || "hull"} />;
            case "box":
            case "sphere":
            case "capsule":
                return () => <PrimitiveCollider collider={collider} />;
            default:
                return null;
        }
    }, [collider]);

    return { auto_strategy, ColliderComponent };
}

export const ObjectPhysics = ({
    physics,
    children = null,
    body_name,
    kinematic_pos_tracking_ref,
    transform
}: {
    physics: PhysicsSystem;
    children?: React.ReactNode;
    body_name?: string;
    kinematic_pos_tracking_ref?: React.RefObject<Group | null>;
    transform?: Transform
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

    useKinematicPosition(rb_ref, rb, kinematic_pos_tracking_ref || container_ref);
    useKinematicVelocity(rb_ref, rb);
    useExplicitMass(rb_ref, rb);
    // usePhysicsReporting(rbRef, physics, monitors, id); // TODO: implement

    return (
        <group ref={container_ref}>
            <RigidBody
                ref={rb_ref}
                name={body_name}
                type={RB_TYPE[rb.type]}
                position={transform?.position}
                quaternion={transform ? rotation_to_quaternion_array(transform.rotation) : undefined}
                colliders={auto_strategy}
                linearVelocity={(rb.type === "dynamic" ? rb.velocity : undefined) || [0, 0, 0]}
                // TODO: angular velocity, friction, damping, other props to be added to config
                //onCollisionEnter={physics.report_collisions ? (e) => reportCollision(id, e) : undefined} // TODO: implement
            >
                {ColliderComponent && <ColliderComponent />}
                {children}
            </RigidBody>
        </group>
    );
};

// TODO: option to ignore player collisions, and option to allow players to pass through objects
