import {ObjectPhysics} from "../engine/ObjectPhysics";
import {useGLTF} from "@react-three/drei";

const MESH_URL = new URL("../../assets/prefabs/basketball_hoop/basketball_hoop.glb", import.meta.url).href;

export const BasketballHoop = () => {
    const {scene} = useGLTF(MESH_URL);

   return (
       <ObjectPhysics physics={{
           rigid_body: {
               type: "fixed",

               collider: {
                   type: "auto",
                   approximation: "trimesh"
               },

               restitution: 0.4,
               friction: 0.5,
           }
       }}>
           <primitive object={scene} />
       </ObjectPhysics>
   )
}
