import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";

import { useAvatarMaterials } from "../hooks/useAvatar";
import { LayerGroup } from "../render/LayerGroup";
import { Layer } from "../render/layers";


const head = new URL("../../assets/player/head/head.glb", import.meta.url).href;

export const AvatarHead = () => {
    const {scene: head_scene} = useGLTF(head);

    // follow vr headset position and rotation
    useFrame(({camera}) => {
        camera.getWorldPosition(head_scene.position);
        camera.getWorldQuaternion(head_scene.quaternion);
    });

    // apply skin colour
    useAvatarMaterials(head_scene);
    
    return (
        <LayerGroup layers={[Layer.PlayerModel_Head]}>
            <primitive object={head_scene} />
        </LayerGroup>
    );
}
