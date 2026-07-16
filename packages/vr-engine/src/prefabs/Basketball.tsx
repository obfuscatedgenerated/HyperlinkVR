import {ObjectPhysics} from "../engine/ObjectPhysics";
import {Grabbable} from "../interaction";
import {useGLTF} from "@react-three/drei";

const MESH_URL = new URL("../../assets/prefabs/basketball/basketball.glb", import.meta.url).href;

export const Basketball = () => {
    const {scene} = useGLTF(MESH_URL);

   return (
       <ObjectPhysics physics={{
           rigid_body: {
               type: "dynamic",

               collider: {
                   type: "sphere",
                   radius: 0.119
               },

               mass: 0.6,
               restitution: 0.8,
               restitution_combine_rule: "max",
               friction: 0.75,
           }
       }}>
           <Grabbable>
               <primitive object={scene} />
           </Grabbable>
       </ObjectPhysics>
   )
}
