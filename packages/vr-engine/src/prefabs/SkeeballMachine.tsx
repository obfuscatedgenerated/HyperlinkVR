import {ObjectPhysics} from "../engine/ObjectPhysics";
import {useGLTF} from "@react-three/drei";

const MACHINE_URL = new URL("../../assets/prefabs/skeeball/machine.glb", import.meta.url).href;

export const Skeeball = () => {
    const {scene} = useGLTF(MACHINE_URL);
    const instance = scene.clone(true);

    return (
        <ObjectPhysics physics={{
            rigid_body: {
                type: "fixed",

                collider: {
                    type: "auto",
                    approximation: "trimesh"
                },

                restitution: 0.1,
                friction: 0.7,
            }
        }}>
            <primitive object={instance}/>
        </ObjectPhysics>
    );
}
