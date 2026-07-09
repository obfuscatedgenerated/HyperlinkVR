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


export const CustomObjectRenderer = ({ mesh, interactions, physics, transform }: RendererComponentProps<CustomObject>) => {
    const visual = useMemo(
        () => (mesh ? <GLTFRenderer url={mesh} /> : null),
        [mesh]
    );

    const with_interactions = useMemo(
        () =>
            interactions ? (
                <ObjectInteractions interactions={interactions}>{visual}</ObjectInteractions>
            ) : (
                visual
            ),
        [interactions, visual]
    );

    const with_physics = useMemo(
        () =>
            physics ? (
                <ObjectPhysics physics={physics} transform={transform}>
                    {with_interactions}
                </ObjectPhysics>
            ) : (
                with_interactions
            ),
        [physics, transform, with_interactions]
    );

    return with_physics;
}
