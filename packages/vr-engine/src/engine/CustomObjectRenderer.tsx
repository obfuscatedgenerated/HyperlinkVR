import { CustomObject } from "@hyperlinkvr/vr-engine-schemas";
import { useGLTF } from "@react-three/drei";


import { RendererComponentProps } from "../types";
import { ObjectInteractions } from "./ObjectInteractions";
import { ObjectPhysics } from "./ObjectPhysics";


const GLTFRenderer = ({url}: {url: string}) => {
    const {scene} = useGLTF(url);
    return <primitive object={scene} />;
}


export const CustomObjectRenderer = (props: RendererComponentProps<CustomObject>) => {
    const visual = props.mesh ? <GLTFRenderer url={props.mesh} /> : null;

    const with_interactions = props.interactions ? (
        <ObjectInteractions interactions={props.interactions}>
            {visual}
        </ObjectInteractions>
    ) : (
        visual
    );

    const with_physics = props.physics ? (
        <ObjectPhysics physics={props.physics}>
            {with_interactions}
        </ObjectPhysics>
    ) : (
        with_interactions
    );

    return with_physics;
}
