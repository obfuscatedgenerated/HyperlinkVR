import { useMemo } from "react";
import { MeshStandardMaterial } from "three";



import { skin_tones, SkinType, SkinWarmth, avatarContext, useStoredAvatarProperty } from "../contexts/AvatarContext";


const SkinPaletteOption = ({skin_type, skin_warmth, on_click, chosen, box_size, position}: {
    skin_type: SkinType;
    skin_warmth: SkinWarmth;
    on_click: () => void;
    chosen: boolean;
    box_size: number;
    position: [number, number, number];
}) => {
    const color = useMemo(() => {
        const skin_tone_obj = skin_tones[skin_type];
        // @ts-ignore
        return skin_tone_obj[skin_warmth] || skin_tone_obj.base;
    }, [skin_type, skin_warmth]);

    const material = useMemo(() => new MeshStandardMaterial({color, roughness: 0.7}), [color]);
    
    return (
        <group onClick={on_click} position={position}>
            <mesh material={material}>
                <boxGeometry args={[box_size, box_size, 0]} />
            </mesh>

            {chosen && (
                <mesh position={[0, 0, -0.001]}>
                    <meshStandardMaterial color="white" wireframe />
                    <boxGeometry args={[box_size * 1.2, box_size * 1.2, 0]} />
                </mesh>
            )}
        </group>
    );
}

export const SkinPalette = ({position, rotation, box_size}: {position: [number, number, number], rotation: [number, number, number], box_size: number}) => {
    // const [skin_type, setSkinType] = useStoredAvatarProperty("skin_type");
    // const [skin_warmth, setSkinWarmth] = useStoredAvatarProperty("skin_warmth");
    const [avatar, setAvatar] = avatarContext();

    // form a grid of skin tones on horizontal, and skin warmth on vertical
    return (
        <group position={position} rotation={rotation}>
            {Object.keys(skin_tones).map((type, i) => {
                const this_type = type as SkinType;
                const skin_tone_obj = skin_tones[this_type];
                return Object.keys(skin_tone_obj).map((warmth, j) => {
                    const this_warmth = warmth as SkinWarmth;
                    const x = i * (box_size + 0.1);
                    const y = j * (box_size + 0.1);
                    return (
                        <SkinPaletteOption
                            key={`${this_type}-${this_warmth}`}
                            skin_type={this_type}
                            skin_warmth={this_warmth}
                            on_click={() => {
                                setAvatar((prev) => ({
                                    ...prev,
                                    skin_type: this_type,
                                    skin_warmth: this_warmth,
                                }));
                            }}
                            chosen={avatar.skin_type === this_type && avatar.skin_warmth === this_warmth}
                            box_size={box_size}
                            position={[x, y, 0]}
                        />
                    );
                });
            })}
        </group>
    );
}
