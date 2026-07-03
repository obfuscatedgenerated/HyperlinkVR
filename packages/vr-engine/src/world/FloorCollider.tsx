import { CuboidCollider, RigidBody } from "@react-three/rapier";

export const FloorCollider = ({ height = 0, size = 1000, thickness = 0.2 }) => {
    return (
        <RigidBody type="fixed">
            <CuboidCollider
                args={[size, thickness / 2, size]}
                position={[0, height - thickness / 2, 0]}
            />
        </RigidBody>
    );
}
