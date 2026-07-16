import {ObjectPhysics} from "../engine/ObjectPhysics";
import {PositionalAudio, useGLTF} from "@react-three/drei";
import type { PositionalAudio as PositionalAudioType } from "three";
import {resolve_interacted, TriggerVolume} from "../interaction/TriggerVolume";
import {useRef} from "react";

const MESH_URL = new URL("../../assets/prefabs/basketball_hoop/basketball_hoop.glb", import.meta.url).href;
const DING_DING_URL = new URL("../../assets/sfx/dingding.opus", import.meta.url).href;

export const BasketballHoop = () => {
    const {scene} = useGLTF(MESH_URL);
    const audio_ref = useRef<PositionalAudioType>(null);

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
                    const audio = audio_ref.current;
                    if (!audio) return;

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
