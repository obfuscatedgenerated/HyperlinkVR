import type {
    GrabbableInteraction,
    Interaction
} from "@hyperlinkvr/vr-engine-schemas";

import { Grabbable } from "../util";
import {useObjectRefs} from "../contexts/ObjectRefsContext";


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

const INTERACTION_MAP: Record<Interaction["type"], React.ComponentType<InteractionWrapperProps<any>> | null> = {
    "grabbable": GrabbableWrapper,
    "controller-button": null,
    "trigger-volume": null
} as const;

export const ObjectInteractions = ({interactions, children}: {interactions: Interaction[], children: React.ReactNode}) => {
    const {id} = useObjectRefs();

    let wrapped_children = children;
    for (const interaction of interactions) {
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
