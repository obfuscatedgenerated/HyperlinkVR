import { useGLTF } from "@react-three/drei";
import { useAvatarMaterials } from "../hooks/useAvatar";


const hair = new URL("../../assets/player/hair/0.glb", import.meta.url).href;

export const AvatarHair = () => {
    const {scene: hair_scene} = useGLTF(hair);

    // apply hair colour
    useAvatarMaterials(hair_scene);
    
    return <primitive object={hair_scene} />;
}
