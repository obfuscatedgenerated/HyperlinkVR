import type {
    DirectionalLightInteraction,
    FollowPlayerInteraction, GlobalAudioInteraction, GrabbableInteraction, Interaction, PointLightInteraction,
    PositionalAudioInteraction, SpotLightInteraction, TriggerVolumeInteraction
} from "@hyperlinkvr/vr-engine-schemas";
import {useEffect, useMemo, useRef} from "react";



import { useObjectRefs } from "../contexts/ObjectRefsContext";
import { useAudioListener } from "../contexts/AudioListenerContext";
import { useInteractionBinding } from "../hooks/useInteractionBinding";
import { Grabbable } from "../interaction";
import { FollowPlayer } from "../interaction/FollowPlayer";
import { resolve_body_part, TriggerVolume } from "../interaction/TriggerVolume";
import {Audio, AudioLoader, DirectionalLight, Euler, Group, PointLight, SpotLight} from "three";
import {PositionalAudio} from "@react-three/drei";
import type { PositionalAudio as PositionalAudioType } from "three";
import {rotation_to_euler} from "./rotation";


interface InteractionWrapperProps<I extends Interaction = Interaction> {
    interaction: I;
    children: React.ReactNode;
}

const GrabbableWrapper = ({interaction, children}: InteractionWrapperProps<GrabbableInteraction>) => {
    const {emit_report} = useInteractionBinding(interaction.binding);

    // TODO: add remaining props to grabbable
    // TODO: should we pass through the root ref? or let the wrapper impls manage their own?
    // TODO: handle grab offset
    return (
        <Grabbable
            collider={interaction.collider}
            grab_distance={interaction.grab_distance}
            on_grab_start={
                interaction.report_grabs
                    ? (hand) => emit_report({ kind: "grab", payload: { type: "grab", handedness: hand.handedness } })
                    : undefined
            }
            on_grab_end={
                interaction.report_releases
                    ? (hand) => emit_report({ kind: "grab", payload: { type: "release", handedness: hand?.handedness ?? "right" } })
                    : undefined
            }
            on_nearby_start={
                interaction.report_proximity
                    ? (hand) => emit_report({ kind: "grab", payload: { type: "proximity", handedness: hand.handedness } })
                    : undefined
            }
        >
            {children}
        </Grabbable>
    );
}

const TriggerVolumeWrapper = ({interaction, children}: InteractionWrapperProps<TriggerVolumeInteraction>) => {
    const {emit_report} = useInteractionBinding(interaction.binding);
    const anchor_ref = useRef<Group>(null);

    return (
        <>
            <group ref={anchor_ref} />
            {children}
            <TriggerVolume
                collider={interaction.collider}
                on_enter={interaction.report_enter
                    ? (payload) => {
                        const part = resolve_body_part(payload);
                        if (!part) return;
                        emit_report({ kind: "trigger-volume", payload: { type: "enter", part } })
                    }
                    : undefined
                }
                on_exit={interaction.report_exit
                    ? (payload) => {
                        const part = resolve_body_part(payload);
                        if (!part) return;
                        emit_report({ kind: "trigger-volume", payload: { type: "exit", part } })
                    }
                    : undefined
                }
                anchor_ref={anchor_ref}
            />
        </>
    )
}

const FollowPlayerWrapper = ({interaction, children}: InteractionWrapperProps<FollowPlayerInteraction>) => {
    const {on_command} = useInteractionBinding(interaction.binding);

    useEffect(() => {
        const handle_command = async (command: string, args?: any) => {
            switch (command) {
                case "set_enabled":
                    interaction.enabled = args.enabled;
                    break;
                default:
                    return {success: false, error: `Unknown command ${command}`};
            }

            return {success: true};
        }

        const unlisten = on_command(handle_command);
        return () => {
            unlisten();
        }
    }, [on_command, interaction]);

    return (
        <FollowPlayer enabled={interaction.enabled} snap_on_release={interaction.snap_on_release}>
            {children}
        </FollowPlayer>
    )
}

const PositionalAudioWrapper = ({interaction, children}: InteractionWrapperProps<PositionalAudioInteraction>) => {
    const {on_command} = useInteractionBinding(interaction.binding);
    const audio_ref = useRef<PositionalAudioType>(null);

    useEffect(() => {
        const handle_command = async (command: string, args?: any) => {
            const audio = audio_ref.current;
            if (!audio) {
                return {success: false, error: "Audio not ready"};
            }

            switch (command) {
                case "play":
                    audio.play();
                    break;
                case "pause":
                    audio.pause();
                    break;
                case "stop":
                    audio.stop();
                    break;
                case "seek": {
                    const is_playing = audio.isPlaying;

                    if (is_playing) {
                        audio.stop();
                    }

                    audio.offset = args.offset;
                    if (is_playing) {
                        audio.play();
                    }
                    break;
                }
                case "is_playing":
                    return audio.isPlaying;
                case "set_loop":
                    interaction.loop = args.loop;
                    break;
                case "set_max_distance":
                    interaction.max_distance = args.max_distance;
                    break;
                case "set_offset":
                    interaction.offset = args.offset;
                    break;
                default:
                    return {success: false, error: `Unknown command ${command}`};
            }

            return {success: true};
        }

        const unlisten = on_command(handle_command);
        return () => {
            unlisten();
        }
    }, [on_command, interaction]);

    return (
        <>
            <PositionalAudio
                ref={audio_ref}
                url={interaction.url}
                loop={interaction.loop}
                autoplay={interaction.autoplay}
                distance={interaction.max_distance}
                position={interaction.offset}
            />
            {children}
        </>
    );
}

const GlobalAudioWrapper = ({interaction, children}: InteractionWrapperProps<GlobalAudioInteraction>) => {
    const {on_command} = useInteractionBinding(interaction.binding);

    const audio_listener = useAudioListener();
    const audio = useMemo(() => new Audio(audio_listener), [audio_listener]);

    // TODO: split into per dep effects
    useEffect(() => {
        const loader = new AudioLoader();
        loader.load(interaction.url, (buffer) => {
            audio.setBuffer(buffer);
            audio.setLoop(interaction.loop);
            audio.setVolume(interaction.volume ?? 1.0);
            if (interaction.autoplay) {
                audio.play();
            }
        });

        return () => {
            audio.stop();
            audio.disconnect();
        };
    }, [interaction.url, interaction.loop, interaction.autoplay, interaction.volume]);

    useEffect(() => {
        const handle_command = async (command: string, args?: any) => {
            switch (command) {
                case "play":
                    audio.play();
                    break;
                case "pause":
                    audio.pause();
                    break;
                case "stop":
                    audio.stop();
                    break;
                case "seek": {
                    const is_playing = audio.isPlaying;

                    if (is_playing) {
                        audio.stop();
                    }

                    audio.offset = args.offset;
                    if (is_playing) {
                        audio.play();
                    }
                    break;
                }
                case "is_playing":
                    return audio.isPlaying;
                case "set_loop":
                    interaction.loop = args.loop;
                    break;
                case "set_volume":
                    interaction.volume = args.volume;
                    break;
                default:
                    return {success: false, error: `Unknown command ${command}`};
            }

            return {success: true};
        }

        const unlisten = on_command(handle_command);
        return () => {
            unlisten();
        }
    }, [on_command, interaction]);

    return children;
}

const PointLightWrapper = ({interaction, children}: InteractionWrapperProps<PointLightInteraction>) => {
    const {on_command} = useInteractionBinding(interaction.binding);

    // doesn't auto sync to props, so need to manually update value via ref when command is received
    const light_ref = useRef<PointLight>(null);

    useEffect(() => {
        const handle_command = async (command: string, args?: any) => {
            const light = light_ref.current;
            if (!light) {
                return {success: false, error: "Light not ready"};
            }

            switch (command) {
                case "set_color":
                    light.color.setHex(args.color);
                    interaction.color = args.color;
                    break;
                case "set_intensity":
                    light.intensity = args.intensity;
                    interaction.intensity = args.intensity;
                    break;
                case "set_offset":
                    light.position.set(args.offset[0], args.offset[1], args.offset[2]);
                    interaction.offset = args.offset;
                    break;
                case "set_distance":
                    light.distance = args.distance;
                    interaction.distance = args.distance;
                    break;
                case "set_decay":
                    light.decay = args.decay;
                    interaction.decay = args.decay;
                    break;
                // TODO: tween commands
                default:
                    return {success: false, error: `Unknown command ${command}`};
            }
            return {success: true};
        }

        const unlisten = on_command(handle_command);
        return () => unlisten();
    }, [on_command, interaction]);

    return (
        <>
            <pointLight
                ref={light_ref}
                color={interaction.color}
                intensity={interaction.intensity}
                distance={interaction.distance}
                decay={interaction.decay}
                position={interaction.offset}
            />
            {children}
        </>
    );
}

const DirectionalLightWrapper = ({interaction, children}: InteractionWrapperProps<DirectionalLightInteraction>) => {
    const {on_command} = useInteractionBinding(interaction.binding);

    // doesn't auto sync to props, so need to manually update value via ref when command is received
    const light_ref = useRef<DirectionalLight>(null);

    useEffect(() => {
        const handle_command = async (command: string, args?: any) => {
            const light = light_ref.current;
            if (!light) {
                return {success: false, error: "Light not ready"};
            }

            switch (command) {
                case "set_color":
                    light.color.setHex(args.color);
                    interaction.color = args.color;
                    break;
                case "set_intensity":
                    light.intensity = args.intensity;
                    interaction.intensity = args.intensity;
                    break;
                case "set_offset":
                    light.position.set(args.offset[0], args.offset[1], args.offset[2]);
                    interaction.offset = args.offset;
                    break;
                case "set_rotation":
                    rotation_to_euler(args.rotation, light.rotation);
                    interaction.rotation = args.rotation;
                    break;
                    // TODO: tween commands
                default:
                    return {success: false, error: `Unknown command ${command}`};
            }
            return {success: true};
        }

        const unlisten = on_command(handle_command);
        return () => unlisten();
    }, [on_command, interaction]);

    const euler_rotation = useMemo(() => {
        const euler = new Euler();
        rotation_to_euler(interaction.rotation, euler);
        return euler;
    }, [interaction.rotation]);

    return (
        <>
            <directionalLight
                ref={light_ref}
                color={interaction.color}
                intensity={interaction.intensity}
                position={interaction.offset}
                rotation={euler_rotation}
            />
            {children}
        </>
    );
}

const SpotLightWrapper = ({interaction, children}: InteractionWrapperProps<SpotLightInteraction>) => {
    const {on_command} = useInteractionBinding(interaction.binding);

    // doesn't auto sync to props, so need to manually update value via ref when command is received
    const light_ref = useRef<SpotLight>(null);

    useEffect(() => {
        const handle_command = async (command: string, args?: any) => {
            const light = light_ref.current;
            if (!light) {
                return {success: false, error: "Light not ready"};
            }

            switch (command) {
                case "set_color":
                    light.color.setHex(args.color);
                    interaction.color = args.color;
                    break;
                case "set_intensity":
                    light.intensity = args.intensity;
                    interaction.intensity = args.intensity;
                    break;
                case "set_offset":
                    light.position.set(args.offset[0], args.offset[1], args.offset[2]);
                    interaction.offset = args.offset;
                    break;
                case "set_rotation":
                    rotation_to_euler(args.rotation, light.rotation);
                    interaction.rotation = args.rotation;
                    break;
                case "set_angle":
                    light.angle = args.angle;
                    interaction.angle = args.angle;
                    break;
                case "set_penumbra":
                    light.penumbra = args.penumbra;
                    interaction.penumbra = args.penumbra;
                    break;
                case "set_distance":
                    light.distance = args.distance;
                    interaction.distance = args.distance;
                    break;
                case "set_decay":
                    light.decay = args.decay;
                    interaction.decay = args.decay;
                    break;
                // TODO: tween commands
                default:
                    return {success: false, error: `Unknown command ${command}`};
            }
            return {success: true};
        }

        const unlisten = on_command(handle_command);
        return () => unlisten();
    }, [on_command, interaction]);

    const euler_rotation = useMemo(() => {
        const euler = new Euler();
        rotation_to_euler(interaction.rotation, euler);
        return euler;
    }, [interaction.rotation]);

    return (
        <>
            <spotLight
                ref={light_ref}
                color={interaction.color}
                intensity={interaction.intensity}
                position={interaction.offset}
                rotation={euler_rotation}
                angle={interaction.angle}
                penumbra={interaction.penumbra}
                distance={interaction.distance}
                decay={interaction.decay}
            />
            {children}
        </>
    );
}

const INTERACTION_MAP: Record<Interaction["type"], React.ComponentType<InteractionWrapperProps<any>> | null> = {
    "grabbable": GrabbableWrapper,
    "follow-player": FollowPlayerWrapper,
    "trigger-volume": TriggerVolumeWrapper,
    "controller-button": null,
    "positional-audio": PositionalAudioWrapper,
    "global-audio": GlobalAudioWrapper,
    "point-light": PointLightWrapper,
    "directional-light": DirectionalLightWrapper,
    "spot-light": SpotLightWrapper,
} as const;

// first is outermost, last is innermost
// follow player must be the parent to grabbable, others dont matter
// TODO: should we enforce only 1 of each interaction type per object? maybe allow multiple controller buttons and trigger volumes tho
const WRAPPER_STRICT_ORDER: Interaction["type"][] = [
    "follow-player",
    "grabbable",
    "controller-button",
    "trigger-volume",
    "positional-audio",
    "global-audio",
    "point-light",
    "directional-light",
    "spot-light",
];

export const ObjectInteractions = ({interactions, children}: {interactions: Interaction[], children: React.ReactNode}) => {
    const {id} = useObjectRefs();

    const sorted_interactions = useMemo(() => [...interactions].sort((a, b) => {
        const a_index = WRAPPER_STRICT_ORDER.indexOf(a.type);
        const b_index = WRAPPER_STRICT_ORDER.indexOf(b.type);

        // reverse order
        return b_index - a_index;
    }), [interactions]);

    let wrapped_children = children;
    for (const interaction of sorted_interactions) {
        const Wrapper = INTERACTION_MAP[interaction.type];
        if (!Wrapper) {
            console.warn(`No wrapper found for interaction type ${interaction.type}`);
            continue;
        }
        console.log(`Wrapping object ${id} with interaction ${interaction.type}`);
        wrapped_children = <Wrapper interaction={interaction}>{wrapped_children}</Wrapper>;
    }

    return <>{wrapped_children}</>;
}
