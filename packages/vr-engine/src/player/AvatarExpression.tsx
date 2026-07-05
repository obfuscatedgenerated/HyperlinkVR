import { useEffect, useMemo, useState } from "react";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

import {
    expression_eyes_options,
    expression_mouth_options,
    ExpressionEyes,
    usePlayerExpression
} from "../contexts/PlayerExpressionContext";
import { Layer, LayerGroup } from "../render";
import { useAvatarMaterials } from "../contexts";

const decompressor = new DRACOLoader();
const loader = new GLTFLoader().setDRACOLoader(decompressor);
const load_glbs = async (base_path: string, glb_names: readonly string[]) => {
    const glb_promises: Promise<GLTF>[] = [];
    for (const name of glb_names) {
        const path = `${base_path}/${name}.glb`;
        glb_promises.push(loader.loadAsync(path));
    }

    return Promise.all(glb_promises).then((glbs) => {
        const glb_map: Record<string, GLTF> = {};
        for (let i = 0; i < glbs.length; i++) {
            glb_map[glb_names[i]] = glbs[i];
        }
        return glb_map;
    });
}

const eyes_path = new URL("../../assets/player/face/eyes", import.meta.url).href;
const mouth_path = new URL("../../assets/player/face/mouth", import.meta.url).href;

export const AvatarExpression = () => {
    const [eyes_glbs, setEyesGlbs] = useState<Record<ExpressionEyes, GLTF> | null>(null);
    const [mouth_glbs, setMouthGlbs] = useState<Record<string, GLTF> | null>(null);

    // load all glbs for quick switching between expressions
    useEffect(() => {
        load_glbs(eyes_path, expression_eyes_options).then((glbs) => {
            setEyesGlbs(glbs as Record<ExpressionEyes, GLTF>);
        });

        load_glbs(mouth_path, expression_mouth_options).then((glbs) => {
            setMouthGlbs(glbs as Record<string, GLTF>);
        });
    }, []);

    const expression = usePlayerExpression();

    const eye = useMemo(() => {
        if (!eyes_glbs) return null;
        return eyes_glbs[expression.eyes];
    }, [eyes_glbs, expression.eyes]);

    const mouth = useMemo(() => {
        if (!mouth_glbs) return null;
        return mouth_glbs[expression.mouth];
    }, [mouth_glbs, expression.mouth]);

    useAvatarMaterials(eye?.scene);
    useAvatarMaterials(mouth?.scene);

    if (!eye || !mouth) {
        return null;
    }

    return (
        <LayerGroup layers={[Layer.PlayerModel_Head]} name="AvatarExpression">
            <primitive object={eye.scene} />
            <primitive object={mouth.scene} />
        </LayerGroup>
    );
}
// TODO: 2-frame animation style
