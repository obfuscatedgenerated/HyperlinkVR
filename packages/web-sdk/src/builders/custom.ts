import {BaseBuilder} from "./base";
import {
    ControllerButtonInteraction,
    CustomObject,
    CustomObjectInput,
    CustomObjectSchema,
    FollowPlayerInteraction,
    GrabbableInteraction,
    Interaction,
    PhysicsSystem,
    TriggerVolumeInteraction
} from "@hyperlinkvr/vr-engine-schemas";

export class CustomObjectBuilder extends BaseBuilder<CustomObjectInput> {
    constructor() {
        super({type: "custom"} as CustomObjectInput);
    }

    set_mesh(glb_url: string) {
        this._internal.mesh = glb_url;
        return this;
    }

    set_physics(physics: PhysicsSystem) {
        this._internal.physics = physics;
        return this;
    }

    add_interaction(interaction: FollowPlayerInteraction): this;
    add_interaction(
        name: string,
        interaction:
            | GrabbableInteraction
            | ControllerButtonInteraction
            | TriggerVolumeInteraction
    ): this;
    add_interaction(
        name_or_interaction: string | Interaction,
        maybe_interaction?: Interaction
    ): this {
        let interaction: Interaction;

        if (typeof name_or_interaction === "string") {
            const name = name_or_interaction;
            if (!maybe_interaction) {
                throw new Error(
                    "An interaction is required when a name is given."
                );
            }
            const clash = (this._internal.interactions ?? []).some(
                (candidate) =>
                    "reporting" in candidate && candidate.reporting?.name === name
            );
            if (clash) {
                throw new Error(
                    `Interaction name "${name}" already used on this object.`
                );
            }
            interaction = {
                ...maybe_interaction,
                reporting: {name}
            } as Interaction;
        } else {
            interaction = name_or_interaction;
        }

        if (!this._internal.interactions) {
            this._internal.interactions = [];
        }
        this._internal.interactions.push(interaction);
        return this;
    }

    add_interactions(interactions: Interaction[]) {
        if (!this._internal.interactions) {
            this._internal.interactions = [];
        }
        this._internal.interactions.push(...interactions);
        return this;
    }

    set_interactions(interactions: Interaction[]) {
        this._internal.interactions = interactions;
        return this;
    }

    build(): CustomObject {
        return CustomObjectSchema.parse(this._internal);
    }
}
