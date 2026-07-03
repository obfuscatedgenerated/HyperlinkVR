import { CustomObject } from "@hyperlinkvr/vr-engine-schemas";
import { useGLTF } from "@react-three/drei";

import { RendererComponentProps } from "../types";
import { ObjectPhysics } from "./ObjectPhysics";


const GLTFRenderer = ({url}: {url: string}) => {
    const {scene} = useGLTF(url);
    return <primitive object={scene} />;
}


export const CustomObjectRenderer = (props: RendererComponentProps<CustomObject>) => {
    const visual = props.mesh ? <GLTFRenderer url={props.mesh} /> : null;

    return (
        props.physics ? (
            <ObjectPhysics physics={props.physics} id={props.id}>
                {visual}
            </ObjectPhysics>
        ) : (
            visual
        )
    );
}
