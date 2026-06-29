import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Euler, Quaternion, Vector3 } from "three";



import { Layer, LayerGroup } from "../render";


const torso = new URL("../../assets/player/torso/torso.glb", import.meta.url).href;

const Y_AXIS = new Vector3(0, 1, 0);

export const AvatarTorso = () => {
    const { scene: torso_scene } = useGLTF(torso);

    useFrame(({ camera }) => {
        const pos = new Vector3();
        const quat = new Quaternion();

        camera.getWorldPosition(pos);
        camera.getWorldQuaternion(quat);

        // place torso below the head
        pos.y -= 0.125;

        // rotate torso to match camera rotation, but only on the y-axis
        // TODO lag rotation slightlky
        const forward = new Vector3(0, 0, -1).applyQuaternion(quat);
        const yaw = Math.atan2(-forward.x, -forward.z);
        quat.setFromAxisAngle(Y_AXIS, yaw);

        // move slightly behind the new forward direction
        const flat_forward = new Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
        pos.add(flat_forward.multiplyScalar(-0.05));

        torso_scene.position.copy(pos);
        torso_scene.quaternion.copy(quat);

        // TODO: rotate in such a manner that the bottom of the torso lags slightly behind so it leans towards locomotion
    });

    return (
        <LayerGroup layers={[Layer.PlayerModel_TorsoAndHands]}>
            <primitive object={torso_scene} />
        </LayerGroup>
    );
};
