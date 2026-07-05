import { ColorPicker } from "./ColorPicker";
import { SkinPalette } from "./SkinPalette";
import { ReflectiveMirror } from "./ReflectiveMirror";
import { useAvatar } from "../contexts/AvatarContext";
import { ComponentProps } from "react";

export const AvatarMirror = (props: ComponentProps<"group">) => {
    const [avatar, setAvatar] = useAvatar();

    return (
        <group {...props}>
            <SkinPalette box_size={0.05} position={[0, 1.75, 0]}  />
            <ReflectiveMirror width={0.75} height={1.25} position={[0, 1, 0]} />
            <ColorPicker position={[2, 0.5, 0]} scale={[2, 2, 2]} color={avatar.hair_hex} on_color_change={(color) => {
                setAvatar((prev) => ({
                    ...prev,
                    hair_hex: color
                }));
            }} />

            <pointLight position={[0, 2, 0]} intensity={2} color={0xffffff} />
        </group>
    );
}
