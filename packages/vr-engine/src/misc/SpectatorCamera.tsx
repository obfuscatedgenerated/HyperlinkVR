import { Grabbable } from "../util/grabbables";
import { useSetting } from "@viewportvr/react";
import { useMemo, useRef } from "react";
import type { Group } from "three";


import { LayerGroup } from "../render/LayerGroup";
import { Layer } from "../render/layers";
import { MixedRealityCameraController } from "../render/MixedRealityCameraController";
import { camera_controller_configs, SpectatorCameraController } from "../render/SpectatorCameraController";
import { useGLTF } from "@react-three/drei";

const camera = new URL("../../assets/misc/camera/camera.glb", import.meta.url).href;

export const SpectatorCamera = () => {
    const [mode] = useSetting("spectator_view");

    const [horiz_fov] = useSetting("third_person_fov");

    const {scene: camera_scene} = useGLTF(camera);

    const camera_model_ref = useRef<Group>(null);

    const config = useMemo(() => {
        if (mode === "first_person") {
            return camera_controller_configs.first_person();
        } else if (mode === "third_person" || mode === "mixed_reality") {
            return camera_controller_configs.third_person_from_object(
                camera_model_ref
            );
        } else {
            throw new Error(`Unknown spectator_view mode: ${mode}`);
        }
    }, [mode]);
// TODO: might want to actually hide from the first person cam too for MR mode
    return (
        <>
            <LayerGroup
                layers={[Layer.ThirdPerson_ForceHide]}
                visible={mode !== "first_person"}
            >
                <Grabbable
                    position={[0.5, 1.5, 0.1]}
                    rotation={[0, Math.PI /12, 0]}
                    ref={camera_model_ref}
                >
                    <primitive object={camera_scene} />
                </Grabbable>
            </LayerGroup>

            {mode !== "mixed_reality" ? (
                <SpectatorCameraController config={config} horizontal_fov={mode !== "first_person" ? horiz_fov : 80} />
            ) : (
                <MixedRealityCameraController third_person_transform={config.frame_transform} third_person_horizontal_fov={horiz_fov} />
            )}
        </>
    );
};
// TODO: option to toggle between follow origin and staying static with trigger (show text that faces you with "Following")
// TODO: fix position of grabbable and the actual camera with locomotion now enabled