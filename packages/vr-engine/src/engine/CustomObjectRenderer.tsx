import { CustomObject } from "@hyperlinkvr/vr-engine-schemas";
import { useGLTF } from "@react-three/drei";


import { RendererComponentProps } from "../types";
import { ObjectInteractions } from "./ObjectInteractions";
import { ObjectPhysics } from "./ObjectPhysics";

import { clone } from "three/examples/jsm/utils/SkeletonUtils";
import {useMemo} from "react";

const GLTFRenderer = ({url}: {url: string}) => {
    const {scene} = useGLTF(url);

    // useGLTF caches the scene by url, so need to clone to render multiple instances of the same model
    const instance = useMemo(() => clone(scene), [scene]);
    return <primitive object={instance} />;
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
        <ObjectPhysics physics={props.physics} transform={props.transform}>
            {with_interactions}
        </ObjectPhysics>
    ) : (
        with_interactions
    );

    return with_physics;
}
