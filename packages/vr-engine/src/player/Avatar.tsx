import { AvatarHead } from "./AvatarHead";
import { AvatarTorso } from "./AvatarTorso";

export const Avatar = () => (
    <group name="Avatar">
        <AvatarHead />
        <AvatarTorso />
    </group>
);

// TODO: bounce torso and head on walk (only visually)
// TODO: visual wind effect on sprint (definitely flat, maybe in vr?)
