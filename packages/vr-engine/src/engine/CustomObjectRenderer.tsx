import { CustomObject } from "@hyperlinkvr/vr-engine-schemas";
import { useGLTF } from "@react-three/drei";



import { RendererComponentProps } from "../types";
import { ObjectInteractions } from "./ObjectInteractions";
import { ObjectPhysics } from "./ObjectPhysics";
import {useRef} from "react";
import {create_object_refs, ObjectRefsProvider} from "../contexts/ObjectRefsContext";


const GLTFRenderer = ({url}: {url: string}) => {
    const {scene} = useGLTF(url);
    return <primitive object={scene} />;
}


export const CustomObjectRenderer = (props: RendererComponentProps<CustomObject>) => {
    const refs = useRef(create_object_refs(props.id));

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

    // TODO: what order do we actually want
    // TODO: make interactions handle grouping/refs better so order doesnt matter of wrapping like here

    return (
        <ObjectRefsProvider value={refs.current}>
            {with_physics}
        </ObjectRefsProvider>
    );
}
