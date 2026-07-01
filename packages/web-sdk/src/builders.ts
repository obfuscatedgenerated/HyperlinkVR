import type { NamedReply } from "@hyperlinkvr/types";
import {
    ButtonPrefab,
    ButtonPrefabInput,
    ButtonPrefabSchema,
    Collider,
    ColliderSchema,
    ControllerButtonInteraction,
    ControllerButtonInteractionInput,
    ControllerButtonInteractionSchema,
    ControllerButtonWhenListen,
    CreatedEngineObject,
    CustomObject,
    CustomObjectInput,
    CustomObjectSchema,
    EngineObject,
    EngineObjectDispatch,
    EngineObjectDispatchInput,
    EngineObjectDispatchSchema,
    GrabbableInteraction,
    GrabbableInteractionInput,
    GrabbableInteractionSchema,
    GrabOffsetInput,
    HexNumericalColor,
    HexNumericalColorSchema,
    Interaction,
    PhysicsSystem,
    PhysicsSystemInput,
    PhysicsSystemSchema,
    RigidBody,
    RigidBodyInput,
    RigidBodySchema,
    RigidBodyType,
    TransformInput,
    TriggerVolumeInteraction,
    TriggerVolumeInteractionInput,
    TriggerVolumeInteractionSchema
} from "@hyperlinkvr/vr-engine-schemas";

import { send_via_rtc } from "./messenger";

export class PhysicsSystemBuilder {
    #physics: PhysicsSystemInput = {};

    set_rigid_body(body: RigidBody) {
        this.#physics.rigid_body = body;
        return this;
    }

    build(): PhysicsSystem {
        return PhysicsSystemSchema.parse(this.#physics);
    }
}

export class RigidBodyBuilder {
    #rigid_body = {} as RigidBodyInput;

    set_type(type: RigidBodyType) {
        this.#rigid_body.type = type;
        return this;
    }

    set_collider(collider: Collider) {
        this.#rigid_body.collider = collider;
        return this;
    }

    set_mass(mass: number) {
        if (this.#rigid_body.type !== "dynamic") {
            throw new Error("Mass can only be set for dynamic rigid bodies.");
        }

        this.#rigid_body.mass = mass;
        return this;
    }

    set_velocity(velocity: [number, number, number]) {
        if (this.#rigid_body.type !== "dynamic" && this.#rigid_body.type !== "kinematic-vel") {
            throw new Error("Velocity can only be set for dynamic or kinematic-vel rigid bodies.");
        }

        this.#rigid_body.velocity = velocity;
        return this;
    }

    build(): RigidBody {
        return RigidBodySchema.parse(this.#rigid_body);
    }
}


export class ColliderBuilder {
    #collider: Collider = {type: "copy-visual-mesh"};

    box(size: [number, number, number]) {
        this.#collider = { type: "box", size };
        return this;
    }

    sphere(radius: number) {
        this.#collider = { type: "sphere", radius };
        return this;
    }

    capsule(radius: number, height: number) {
        this.#collider = { type: "capsule", radius, height };
        return this;
    }

    custom_mesh(mesh_url: string) {
        this.#collider = { type: "custom-mesh", mesh: mesh_url };
        return this;
    }

    copy_visual_mesh() {
        this.#collider = { type: "copy-visual-mesh" };
        return this;
    }

    build(): Collider {
        return ColliderSchema.parse(this.#collider);
    }
}

export class GrabbableInteractionBuilder {
    #interaction: GrabbableInteractionInput = {
        type: "grabbable"
    };

    set_grab_distance(distance: number) {
        this.#interaction.grab_distance = distance;
        return this;
    }

    set_grab_offset(offset: GrabOffsetInput) {
        this.#interaction.grab_offset = offset;
        return this;
    }

    // these ones default to true, so having a default boolean here doesnt make sense, must explicitly set to false to disable

    set_sticky(sticky: boolean) {
        this.#interaction.sticky = sticky;
        return this;
    }

    set_snaps_to_hand(snaps: boolean) {
        this.#interaction.snaps_to_hand = snaps;
        return this;
    }

    // these below are default false, so specifying .reports_grabs() should make it true by default

    reports_grabs(reports = true) {
        this.#interaction.report_grabs = reports;
        return this;
    }

    reports_releases(reports = true) {
        this.#interaction.report_releases = reports;
        return this;
    }

    reports_proximity(reports = true) {
        this.#interaction.report_proximity = reports;
        return this;
    }

    build(): GrabbableInteraction {
        return GrabbableInteractionSchema.parse(this.#interaction);
    }
}

export class ControllerButtonInteractionBuilder {
    #interaction = { type: "controller-button" } as ControllerButtonInteractionInput;

    set_button(button: string) {
        this.#interaction.button = button;
        return this;
    }

    set_when_listen(when: ControllerButtonWhenListen) {
        this.#interaction.when_listen = when;
        return this;
    }

    set_reports_press(reports: boolean) {
        this.#interaction.report_press = reports;
        return this;
    }

    set_reports_release(reports: boolean) {
        this.#interaction.report_release = reports;
        return this;
    }

    build(): ControllerButtonInteraction {
        return ControllerButtonInteractionSchema.parse(this.#interaction);
    }
}

export class TriggerVolumeInteractionBuilder {
    #interaction = { type: "trigger-volume" } as TriggerVolumeInteractionInput;

    set_collider(collider: Collider) {
        this.#interaction.collider = collider;
        return this;
    }

    set_reports_enter(reports: boolean) {
        this.#interaction.report_enter = reports;
        return this;
    }

    set_reports_exit(reports: boolean) {
        this.#interaction.report_exit = reports;
        return this;
    }

    ignore_hands(ignore = true) {
        this.#interaction.ignore_hands = ignore;
        return this;
    }

    ignore_torso(ignore = true) {
        this.#interaction.ignore_torso = ignore;
        return this;
    }

    ignore_head(ignore = true) {
        this.#interaction.ignore_head = ignore;
        return this;
    }

    build(): TriggerVolumeInteraction {
        return TriggerVolumeInteractionSchema.parse(this.#interaction);
    }
}


export class CustomObjectBuilder {
    #object = { type: "custom" } as CustomObjectInput;

    set_mesh(glb_url: string) {
        this.#object.mesh = glb_url;
        return this;
    }

    set_physics(physics: PhysicsSystem) {
        this.#object.physics = physics;
        return this;
    }

    add_interaction(interaction: Interaction) {
        if (!this.#object.interactions) {
            this.#object.interactions = [];
        }
        this.#object.interactions.push(interaction);
        return this;
    }

    add_interactions(interactions: Interaction[]) {
        if (!this.#object.interactions) {
            this.#object.interactions = [];
        }
        this.#object.interactions.push(...interactions);
        return this;
    }

    set_interactions(interactions: Interaction[]) {
        this.#object.interactions = interactions;
        return this;
    }

    build(): CustomObject {
        return CustomObjectSchema.parse(this.#object);
    }
}

export class ButtonPrefabBuilder {
    #prefab = { name: "button" } as ButtonPrefabInput;

    set_label(label: string) {
        this.#prefab.label = label;
        return this;
    }

    set_color(color: HexNumericalColor) {
        this.#prefab.color = HexNumericalColorSchema.parse(color);
        return this;
    }

    build(): ButtonPrefab {
        return ButtonPrefabSchema.parse(this.#prefab);
    }
}

export class EngineObjectDispatchBuilder {
    #dispatch = {} as EngineObjectDispatchInput;

    set_object(object: EngineObject) {
        this.#dispatch.object = object;
        return this;
    }

    set_position(x: number, y: number, z: number) {
        if (!this.#dispatch.transform) {
            this.#dispatch.transform = {};
        }
        this.#dispatch.transform.position = [x, y, z];
        return this;
    }

    set_euler_rotation(x: number, y: number, z: number) {
        if (!this.#dispatch.transform) {
            this.#dispatch.transform = {};
        }
        this.#dispatch.transform.rotation = [x, y, z];
        return this;
    }

    set_quaternion_rotation(x: number, y: number, z: number, w: number) {
        if (!this.#dispatch.transform) {
            this.#dispatch.transform = {};
        }
        this.#dispatch.transform.rotation = [x, y, z, w];
        return this;
    }

    set_scale(x: number, y: number, z: number) {
        if (!this.#dispatch.transform) {
            this.#dispatch.transform = {};
        }
        this.#dispatch.transform.scale = [x, y, z];
        return this;
    }

    set_transform(transform: TransformInput) {
        this.#dispatch.transform = transform;
        return this;
    }

    set_user_data_value(key: string, value: any) {
        if (!this.#dispatch.user_data) {
            this.#dispatch.user_data = {};
        }
        this.#dispatch.user_data[key] = value;
        return this;
    }

    set_user_data(user_data: Record<string, any>) {
        this.#dispatch.user_data = user_data;
        return this;
    }

    build(): EngineObjectDispatch {
        return EngineObjectDispatchSchema.parse(this.#dispatch);
    }

    async create(): Promise<CreatedEngineObject> {
        const built_object = this.build();
        const created = (await send_via_rtc({
            action: "HVRSDK_CREATE_ENGINE_OBJECT",
            object: built_object
        })) as NamedReply<"HVRSDK_CREATE_ENGINE_OBJECT">;
        // TODO: handle timeouts and errors

        return created.object;
    }
}

// example usage for custom object:
/*
const sword = new CustomObjectBuilder()
    .set_mesh("https://example.com/sword.glb")
    .set_physics(new PhysicsSystemBuilder()
        .set_rigid_body(new RigidBodyBuilder()
            .set_type("dynamic")
            .set_collider(new ColliderBuilder().box([0.1, 1, 0.1]).build())
            .set_mass(2)
            .build()
        )
        .build()
    )
    .add_interaction(new GrabbableInteractionBuilder()
        .reports_grabs() // now recieves events when object grabbed
        .build()
    )
    .build();

const created_sword = await new EngineObjectDispatchBuilder()
    .set_object(sword)
    .set_position(0, 1, -2)
    .create();

console.log("Created sword object with ID:", created_sword.id);
 */

// example usage for button prefab:
/*
const button = new ButtonPrefabBuilder()
    .set_label("Press Me")
    .set_color(0xff0000)
    .build();

const created_button = await new EngineObjectDispatchBuilder()
    .set_object(button)
    .set_position(1, 1, -2)
    .create();

console.log("Created button object with ID:", created_button.id);
*/
