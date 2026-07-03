import { Collider, PhysicsSystem, RigidBody as RigidBodyConfig } from "@hyperlinkvr/vr-engine-schemas";
import { useGLTF } from "@react-three/drei";
import { BallCollider, CapsuleCollider, CuboidCollider, MeshCollider, RapierRigidBody, RigidBody } from "@react-three/rapier";
import { useEffect, useRef } from "react";

const RB_TYPE = {
    fixed: "fixed",
    dynamic: "dynamic",
    "kinematic-pos": "kinematicPosition",
    "kinematic-vel": "kinematicVelocity"
} as const;

const PrimitiveCollider = ({ collider }: { collider: Collider }) => {
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

const URLMeshCollider = ({
    url,
    approximation
}: {
    url: string;
    approximation: string;
}) => {
    const { scene } = useGLTF(url);
    return (
        // TODO: fix typing
        <MeshCollider type={approximation as any}>
            <primitive object={scene} visible={false} />
        </MeshCollider>
    );
};

const useKinematicVelocity = (
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

const useExplicitMass = (
    ref: React.RefObject<RapierRigidBody | null>,
    rb: RigidBodyConfig
) => {
    useEffect(() => {
        if (rb.type !== "dynamic" || !ref.current) return;
        ref.current.setAdditionalMass(rb.mass, true);
    }, [ref, rb]);
};

export const ObjectPhysics = ({
    physics,
    id,
    children
}: {
    physics: PhysicsSystem;
    id: string;
    children: React.ReactNode;
}) => {
    const rb = physics.rigid_body ?? { type: "fixed" as const };
    const rb_ref = useRef<RapierRigidBody>(null);

    const collider: Collider = rb.collider ?? {
        type: "auto",
        approximation: rb.type === "fixed" ? "trimesh" : "hull"
    };
    const auto_strategy =
        collider.type === "auto" ? (collider.approximation as any) : false;

    useKinematicVelocity(rb_ref, rb);
    useExplicitMass(rb_ref, rb);
    // usePhysicsReporting(rbRef, physics, monitors, id); // TODO: implement
    return (
        <RigidBody
            ref={rb_ref}
            type={RB_TYPE[rb.type]}
            colliders={auto_strategy}
            linearVelocity={(rb.type === "dynamic" ? rb.velocity : undefined) || [0, 0, 0]}
            // TODO: angular velocity, friction, damping, other props to be added to config
            //onCollisionEnter={physics.report_collisions ? (e) => reportCollision(id, e) : undefined} // TODO: implement
        >
            {collider.type === "custom-mesh" && (
                <URLMeshCollider
                    url={collider.mesh}
                    approximation={collider.approximation || "hull"}
                />
            )}
            {(collider.type === "box" ||
                collider.type === "sphere" ||
                collider.type === "capsule") && (
                <PrimitiveCollider collider={collider} />
            )}
            {children}
        </RigidBody>
    );
};

// TODO: option to ignore player collisions, and option to allow players to pass through objects
// TODO: player interactions with physics
