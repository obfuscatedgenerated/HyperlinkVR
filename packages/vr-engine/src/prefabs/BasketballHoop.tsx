import {ObjectPhysics} from "../engine/ObjectPhysics";
import {PositionalAudio, useGLTF} from "@react-three/drei";
import type { PositionalAudio as PositionalAudioType } from "three";
import {resolve_interacted, TriggerVolume} from "../interaction/TriggerVolume";
import {useRef} from "react";
import {useObjectBinding} from "../hooks/useObjectBinding";
import {BindingConfig, CylinderCollider} from "@hyperlinkvr/vr-engine-schemas";

const MESH_URL = new URL("../../assets/prefabs/basketball_hoop/basketball_hoop.glb", import.meta.url).href;
const DING_DING_URL = new URL("../../assets/sfx/dingding.opus", import.meta.url).href;

const TOP_COLLIDER = {
    type: "cylinder",
    radius: 0.15,
    height: 0.025,
    offset: [0, -0.35, 0.375]
} as CylinderCollider;

const BOTTOM_COLLIDER = {
    type: "cylinder",
    radius: 0.18,
    height: 0.025,
    offset: [0, -0.6, 0.375]
} as CylinderCollider;

const TOP_TO_BOTTOM_TIME = 5000;

export const BasketballHoop = ({enable_sfx, binding}: {enable_sfx?: boolean, binding?: BindingConfig}) => {
    const {scene} = useGLTF(MESH_URL);
    const audio_ref = useRef<PositionalAudioType>(null);

    const {emit_report} = useObjectBinding(binding);

    const entered_top = useRef(new Map<string, number>());

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
                collider={TOP_COLLIDER}
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

                    if (!interacted || interacted.type !== "object") return;

                    // const positioning = detect_trigger_direction(payload, TOP_COLLIDER);
                    // if (!positioning) return;

                    // const {direction} = positioning;

                    const linvel = payload.other.rigidBody?.linvel();
                    if (!linvel) return;

                    // travelling down means the ball is going through the hoop from above
                    if (linvel.y < 0) {
                        entered_top.current.set(interacted.object_id, performance.now());
                        setTimeout(() => {
                            entered_top.current.delete(interacted.object_id);
                        }, TOP_TO_BOTTOM_TIME);
                    }
                }}
            />
            <TriggerVolume
                collider={BOTTOM_COLLIDER}
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

                    if (!interacted || interacted.type !== "object") return;

                    const entered_time = entered_top.current.get(interacted.object_id);
                    if (!entered_time) return;

                    if (performance.now() - entered_time > TOP_TO_BOTTOM_TIME) {
                        return;
                    }

                    const linvel = payload.other.rigidBody?.linvel();
                    if (!linvel) return;

                    // it hit the top collider within good time and is still moving downwards, so it must have gone through the hoop
                    if (linvel.y < 0) {
                        entered_top.current.delete(interacted.object_id);

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

                        // TODO: way to make dupe audio events overlap each other (expose to the sdk too)
                        audio.stop();
                        audio.offset = 0;
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
