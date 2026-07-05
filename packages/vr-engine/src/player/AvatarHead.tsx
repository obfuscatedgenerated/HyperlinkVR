import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";

import { useAvatarMaterials } from "../hooks/useAvatar";
import { LayerGroup } from "../render/LayerGroup";
import { Layer } from "../render/layers";
import { AvatarExpression } from "./AvatarExpression";
import { useRef } from "react";
import { Group } from "three";
import { AvatarHair } from "./AvatarHair";


const head = new URL("../../assets/player/head/head.glb", import.meta.url).href;

export const AvatarHead = () => {
    const {scene: head_scene} = useGLTF(head);
    const group_ref = useRef<Group>(null);

    // follow vr headset position and rotation
    useFrame(({camera}) => {
        if (!group_ref.current) return;

        camera.getWorldPosition(group_ref.current.position);
        camera.getWorldQuaternion(group_ref.current.quaternion);
    });

    // apply skin colour
    useAvatarMaterials(head_scene);
    
    return (
        <LayerGroup ref={group_ref} layers={[Layer.PlayerModel_Head]}>
            <AvatarHair />

            <primitive object={head_scene} />

            <AvatarExpression />
        </LayerGroup>
    );
}
