import type { FollowPlayerInteraction, GrabbableInteraction, Interaction, TriggerVolumeInteraction } from "@hyperlinkvr/vr-engine-schemas";
import { useMemo } from "react";



import { useObjectRefs } from "../contexts/ObjectRefsContext";
import { useReportEmitter } from "../hooks/useReportEmitter";
import { Grabbable } from "../interaction";
import { FollowPlayer } from "../interaction/FollowPlayer";
import { resolve_body_part, TriggerVolume } from "../interaction/TriggerVolume";

interface InteractionWrapperProps<I extends Interaction = Interaction> {
    interaction: I;
    children: React.ReactNode;
}

const GrabbableWrapper = ({interaction, children}: InteractionWrapperProps<GrabbableInteraction>) => {
    const emit = useReportEmitter(interaction.reporting);

    // TODO: add remaining props to grabbable
    // TODO: should we pass through the root ref? or let the wrapper impls manage their own?
    return (
        <Grabbable
            collider={interaction.collider}
            grab_distance={interaction.grab_distance}
            on_grab_start={
                interaction.report_grabs
                    ? (hand) => emit({ kind: "grab", payload: { type: "grab", handedness: hand.handedness } })
                    : undefined
            }
            on_grab_end={
                interaction.report_releases
                    ? (hand) => emit({ kind: "grab", payload: { type: "release", handedness: hand?.handedness ?? "right" } })
                    : undefined
            }
            on_nearby_start={
                interaction.report_proximity
                    ? (hand) => emit({ kind: "grab", payload: { type: "proximity", handedness: hand.handedness } })
                    : undefined
            }
        >
            {children}
        </Grabbable>
    );
}

const TriggerVolumeWrapper = ({interaction, children}: InteractionWrapperProps<TriggerVolumeInteraction>) => {
    const emit = useReportEmitter(interaction.reporting);

    return (
        <TriggerVolume
            collider={interaction.collider}
            on_enter={interaction.report_enter
                ? (payload) => {
                    const part = resolve_body_part(payload);
                    if (!part) return;
                    emit({ kind: "trigger-volume", payload: { type: "enter", part } })
                }
                : undefined
            }
            on_exit={interaction.report_exit
                ? (payload) => {
                    const part = resolve_body_part(payload);
                    if (!part) return;
                    emit({ kind: "trigger-volume", payload: { type: "exit", part } })
                }
                : undefined
            }
        >
            {children}
        </TriggerVolume>
    )
}

const FollowPlayerWrapper = ({interaction, children}: InteractionWrapperProps<FollowPlayerInteraction>) => {
    return (
        <FollowPlayer enabled={interaction.enabled} snap_on_release={interaction.snap_on_release}>
            {children}
        </FollowPlayer>
    )
}

const INTERACTION_MAP: Record<Interaction["type"], React.ComponentType<InteractionWrapperProps<any>> | null> = {
    "grabbable": GrabbableWrapper,
    "follow-player": FollowPlayerWrapper,
    "trigger-volume": TriggerVolumeWrapper,
    "controller-button": null
} as const;

// follow player must be the parent to grabbable, others dont matter
// TODO: should we enforce only 1 of each interaction type per object? maybe allow multiple controller buttons and trigger volumes tho
const WRAPPER_STRICT_ORDER: Interaction["type"][] = [
    "follow-player",
    "grabbable",
    "controller-button",
    "trigger-volume"
];

export const ObjectInteractions = ({interactions, children}: {interactions: Interaction[], children: React.ReactNode}) => {
    const {id} = useObjectRefs();

    const sorted_interactions = useMemo(() => [...interactions].sort((a, b) => {
        const a_index = WRAPPER_STRICT_ORDER.indexOf(a.type);
        const b_index = WRAPPER_STRICT_ORDER.indexOf(b.type);
        return a_index - b_index;
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
