import {ObjectPhysics} from "../engine/ObjectPhysics";
import {PositionalAudio, useGLTF} from "@react-three/drei";
import type { PositionalAudio as PositionalAudioType } from "three";
import {resolve_interacted, TriggerVolume} from "../interaction/TriggerVolume";
import {useRef} from "react";
import {useObjectBinding} from "../hooks/useObjectBinding";
import {BindingConfig} from "@hyperlinkvr/vr-engine-schemas";

const MESH_URL = new URL("../../assets/prefabs/basketball_hoop/basketball_hoop.glb", import.meta.url).href;
const DING_DING_URL = new URL("../../assets/sfx/dingding.opus", import.meta.url).href;

export const BasketballHoop = ({enable_sfx, binding}: {enable_sfx?: boolean, binding?: BindingConfig}) => {
    const {scene} = useGLTF(MESH_URL);
    const audio_ref = useRef<PositionalAudioType>(null);

    const {emit_report} = useObjectBinding(binding);

    return (
        <>
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
                <primitive object={scene}/>
            </ObjectPhysics>

            <TriggerVolume
                collider={{
                    type: "cylinder",
                    radius: 0.2,
                    height: 0.025,
                    offset: [0, -0.475, 0.375]
                }}
                on_enter={(payload) => {
                    const interacted = resolve_interacted(payload, {
                        ignore_torso: true,
                        ignore_head: true,
                        ignore_hands: true,
                        objects: {
                            include: true,
                            tag_filter: ["basketball"]
                        }
                    });

                    if (interacted) {
                        emit_report({
                            kind: "basketball-hoop-prefab",
                            payload: {
                                type: "scored",
                                object_id: interacted.type === "object" ? interacted.object_id : undefined
                            }
                        });

                        if (enable_sfx === false) return;

                        const audio = audio_ref.current;
                        if (!audio) return;

                        audio.play();
                    }
                }}
            />

            <PositionalAudio
                ref={audio_ref}
                url={DING_DING_URL}
                distance={5}
                autoplay={false}
                loop={false}
            />
        </>
    )
}
