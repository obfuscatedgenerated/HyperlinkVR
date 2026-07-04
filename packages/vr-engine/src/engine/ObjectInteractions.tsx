import type {
    FollowPlayerInteraction,
    GrabbableInteraction,
    Interaction
} from "@hyperlinkvr/vr-engine-schemas";

import { Grabbable } from "../interaction";
import {useObjectRefs} from "../contexts/ObjectRefsContext";
import { FollowPlayer } from "../interaction/FollowPlayer";
import { useMemo } from "react";


interface InteractionWrapperProps<I extends Interaction = Interaction> {
    interaction: I;
    children: React.ReactNode;
}

const GrabbableWrapper = ({interaction, children}: InteractionWrapperProps<GrabbableInteraction>) => {
    // TODO: add remaining props to grabbable
    // TODO: should we pass through the root ref? or let the wrapper impls manage their own?
    return (
        <Grabbable
            collider={interaction.collider}
            grab_distance={interaction.grab_distance}
        >
            {children}
        </Grabbable>
    );
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
    "controller-button": null,
    "trigger-volume": null
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
