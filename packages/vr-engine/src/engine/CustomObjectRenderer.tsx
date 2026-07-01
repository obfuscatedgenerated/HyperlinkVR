import { CustomObject } from "@hyperlinkvr/vr-engine-schemas";
import { RendererComponentProps } from "../types";
import { useGLTF } from "@react-three/drei";

const GLTFRenderer = ({url}: {url: string}) => {
    const {scene} = useGLTF(url);
    return <primitive object={scene} />;
}

export const CustomObjectRenderer = (props: RendererComponentProps<CustomObject>) => {
    // TODO: handle physics requested etc
    return (
        <>
            {props.mesh && <GLTFRenderer url={props.mesh} />}
        </>
    )
}
