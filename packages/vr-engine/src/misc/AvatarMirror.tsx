import { ColorPicker } from "./ColorPicker";
import { SkinPalette } from "./SkinPalette";
import { ReflectiveMirror } from "./ReflectiveMirror";
import { avatarContext } from "../contexts/AvatarContext";

export const AvatarMirror = () => {
    const [avatar, setAvatar] = avatarContext();

    return (
        <>
            <SkinPalette box_size={0.05} position={[2, 1.75, 0]} rotation={[0, -Math.PI/2, 0]} />
            <ReflectiveMirror width={0.75} height={1.25} position={[2, 1, 0]} rotation={[0, -Math.PI/2, 0]} />
            <ColorPicker position={[2, 0.5, 2]} rotation={[0, -Math.PI/2, 0]} scale={[2,2,2]} color={avatar.hair_hex} on_color_change={(color) => {
                setAvatar((prev) => ({
                    ...prev,
                    hair_hex: color
                }));
            }} />
        </>
    );
}
