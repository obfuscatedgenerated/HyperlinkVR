import { useGLTF } from "@react-three/drei";

import { LayerGroup } from "../render/LayerGroup";
import { Layer } from "../render/layers";
import {useFrame} from "@react-three/fiber";


const head = new URL("../../assets/player/head/head.glb", import.meta.url).href;

export const AvatarHead = () => {
    const {scene: head_scene} = useGLTF(head);

    // follow vr headset position and rotation
    useFrame(({camera}) => {
        camera.getWorldPosition(head_scene.position);
        camera.getWorldQuaternion(head_scene.quaternion);
    });
    
    return (
        <LayerGroup layers={[Layer.PlayerModel_Head]}>
            <primitive object={head_scene} />
        </LayerGroup>
    );
}
