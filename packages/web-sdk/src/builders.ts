import type { NamedReply } from "@hyperlinkvr/types";
import {
    AxesBasedMonitorInput,
    AxisRange,
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
    MeshApproximation,
    CustomMeshApproximation,
    Monitor,
    MonitorSchema,
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

class BaseBuilder<InternalType> {
    protected _internal: InternalType;

    constructor(initial: InternalType) {
        this._internal = initial;
    }

    static from_data<B extends BaseBuilder<any>, D>(
        this: new (data: D) => B,
        data: D
    ): B {
        return new this(JSON.parse(JSON.stringify(data)));
    }

    clone(): this {
        return (this.constructor as any).from_data(this._internal);
    }
}

export class PhysicsSystemBuilder extends BaseBuilder<PhysicsSystemInput> {
    constructor() {
        super({});
    }

    set_rigid_body(body: RigidBody) {
        this._internal.rigid_body = body;
        return this;
    }

    build(): PhysicsSystem {
        return PhysicsSystemSchema.parse(this._internal);
    }
}

class RigidBodyBuilder extends BaseBuilder<RigidBodyInput> {
    constructor(type: RigidBodyType) {
        super({ type } as RigidBodyInput);
    }

    set_collider(collider: Collider) {
        this._internal.collider = collider;
        return this;
    }

    protected _try_set_mass(mass: number) {
        if (this._internal.type !== "dynamic") {
            throw new Error("Mass can only be set for dynamic rigid bodies.");
        }

        this._internal.mass = mass;
        return this;
    }

    protected _try_set_velocity(velocity: [number, number, number]) {
        if (
            this._internal.type !== "dynamic" &&
            this._internal.type !== "kinematic-vel"
        ) {
            throw new Error(
                "Velocity can only be set for dynamic or kinematic-vel rigid bodies."
            );
        }

        this._internal.velocity = velocity;
        return this;
    }

    build(): RigidBody {
        return RigidBodySchema.parse(this._internal);
    }
}

export class DynamicRigidBodyBuilder extends RigidBodyBuilder {
    constructor() {
        super("dynamic");
    }

    set_mass(mass: number) {
        return this._try_set_mass(mass);
    }

    set_velocity(velocity: [number, number, number]) {
        return this._try_set_velocity(velocity);
    }
}

export class KinematicPosRigidBodyBuilder extends RigidBodyBuilder {
    constructor() {
        super("kinematic-pos");
    }
}

export class KinematicVelRigidBodyBuilder extends RigidBodyBuilder {
    constructor() {
        super("kinematic-vel");
    }

    set_velocity(velocity: [number, number, number]) {
        return this._try_set_velocity(velocity);
    }
}

export class FixedRigidBodyBuilder extends RigidBodyBuilder {
    constructor() {
        super("fixed");
    }
}

export class ColliderBuilder extends BaseBuilder<Collider> {
    constructor() {
        super({ type: "auto" });
    }

    box(size: [number, number, number]) {
        this._internal = { type: "box", size };
        return this;
    }

    sphere(radius: number) {
        this._internal = { type: "sphere", radius };
        return this;
    }

    capsule(radius: number, height: number) {
        this._internal = { type: "capsule", radius, height };
        return this;
    }

    custom_mesh(mesh_url: string, approximation?: CustomMeshApproximation) {
        this._internal = { type: "custom-mesh", mesh: mesh_url, approximation };
        return this;
    }

    auto(approximation?: MeshApproximation) {
        this._internal = { type: "auto", approximation };
        return this;
    }

    build(): Collider {
        return ColliderSchema.parse(this._internal);
    }
}

export class GrabbableInteractionBuilder extends BaseBuilder<GrabbableInteractionInput> {
    constructor() {
        super({
            type: "grabbable"
        });
    }

    set_grab_distance(distance: number) {
        this._internal.grab_distance = distance;
        return this;
    }

    set_grab_offset(offset: GrabOffsetInput) {
        this._internal.grab_offset = offset;
        return this;
    }

    // these ones default to true, so having a default boolean here doesnt make sense, must explicitly set to false to disable

    set_sticky(sticky: boolean) {
        this._internal.sticky = sticky;
        return this;
    }

    set_snaps_to_hand(snaps: boolean) {
        this._internal.snaps_to_hand = snaps;
        return this;
    }

    // these below are default false, so specifying .reports_grabs() should make it true by default

    reports_grabs(reports = true) {
        this._internal.report_grabs = reports;
        return this;
    }

    reports_releases(reports = true) {
        this._internal.report_releases = reports;
        return this;
    }

    reports_proximity(reports = true) {
        this._internal.report_proximity = reports;
        return this;
    }

    build(): GrabbableInteraction {
        return GrabbableInteractionSchema.parse(this._internal);
    }
}

export class ControllerButtonInteractionBuilder extends BaseBuilder<ControllerButtonInteractionInput> {
    constructor() {
        super({
            type: "controller-button"
        } as ControllerButtonInteractionInput);
    }

    set_button(button: string) {
        this._internal.button = button;
        return this;
    }

    set_when_listen(when: ControllerButtonWhenListen) {
        this._internal.when_listen = when;
        return this;
    }

    set_reports_press(reports: boolean) {
        this._internal.report_press = reports;
        return this;
    }

    set_reports_release(reports: boolean) {
        this._internal.report_release = reports;
        return this;
    }

    build(): ControllerButtonInteraction {
        return ControllerButtonInteractionSchema.parse(this._internal);
    }
}

export class TriggerVolumeInteractionBuilder extends BaseBuilder<TriggerVolumeInteractionInput> {
    constructor() {
        super({ type: "trigger-volume" } as TriggerVolumeInteractionInput);
    }

    set_collider(collider: Collider) {
        this._internal.collider = collider;
        return this;
    }

    set_reports_enter(reports: boolean) {
        this._internal.report_enter = reports;
        return this;
    }

    set_reports_exit(reports: boolean) {
        this._internal.report_exit = reports;
        return this;
    }

    ignore_hands(ignore = true) {
        this._internal.ignore_hands = ignore;
        return this;
    }

    ignore_torso(ignore = true) {
        this._internal.ignore_torso = ignore;
        return this;
    }

    ignore_head(ignore = true) {
        this._internal.ignore_head = ignore;
        return this;
    }

    build(): TriggerVolumeInteraction {
        return TriggerVolumeInteractionSchema.parse(this._internal);
    }
}

export class CustomObjectBuilder extends BaseBuilder<CustomObjectInput> {
    constructor() {
        super({ type: "custom" } as CustomObjectInput);
    }

    set_mesh(glb_url: string) {
        this._internal.mesh = glb_url;
        return this;
    }

    set_physics(physics: PhysicsSystem) {
        this._internal.physics = physics;
        return this;
    }

    add_interaction(interaction: Interaction) {
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

export class ButtonPrefabBuilder extends BaseBuilder<ButtonPrefabInput> {
    constructor() {
        super({ type: "prefab", name: "button" } as ButtonPrefabInput);
    }

    set_label(label: string) {
        this._internal.label = label;
        return this;
    }

    set_color(color: HexNumericalColor) {
        this._internal.color = HexNumericalColorSchema.parse(color);
        return this;
    }

    build(): ButtonPrefab {
        return ButtonPrefabSchema.parse(this._internal);
    }
}

class AxesBasedMonitorBuilder extends BaseBuilder<AxesBasedMonitorInput> {
    constructor(
        type: "position" | "rotation" | "linear-velocity" | "angular-velocity",
        name: string
    ) {
        super({ type, name });
    }

    rename(name: string) {
        this._internal.name = name;
        return this;
    }

    when(cond: "any" | "all" | "xor") {
        this._internal.when = cond;
        return this;
    }

    x(range: AxisRange) {
        this._internal.x = range;
        return this;
    }

    y(range: AxisRange) {
        this._internal.y = range;
        return this;
    }

    z(range: AxisRange) {
        this._internal.z = range;
        return this;
    }

    build(): Monitor {
        return MonitorSchema.parse(this._internal);
    }
}

export class PositionMonitorBuilder extends AxesBasedMonitorBuilder {
    constructor(name: string) {
        super("position", name);
    }
}

export class RotationMonitorBuilder extends AxesBasedMonitorBuilder {
    constructor(name: string) {
        super("rotation", name);
    }
}

export class LinearVelocityMonitorBuilder extends AxesBasedMonitorBuilder {
    constructor(name: string) {
        super("linear-velocity", name);
    }
}

export class AngularVelocityMonitorBuilder extends AxesBasedMonitorBuilder {
    constructor(name: string) {
        super("angular-velocity", name);
    }
}

export class EngineObjectDispatchBuilder extends BaseBuilder<EngineObjectDispatchInput> {
    constructor() {
        super({} as EngineObjectDispatchInput);
    }

    set_object(object: EngineObject) {
        this._internal.object = object;
        return this;
    }

    set_position(x: number, y: number, z: number) {
        if (!this._internal.transform) {
            this._internal.transform = {};
        }
        this._internal.transform.position = [x, y, z];
        return this;
    }

    set_euler_rotation(x: number, y: number, z: number) {
        if (!this._internal.transform) {
            this._internal.transform = {};
        }
        this._internal.transform.rotation = [x, y, z];
        return this;
    }

    set_quaternion_rotation(x: number, y: number, z: number, w: number) {
        if (!this._internal.transform) {
            this._internal.transform = {};
        }
        this._internal.transform.rotation = [x, y, z, w];
        return this;
    }

    set_scale(x: number, y: number, z: number) {
        if (!this._internal.transform) {
            this._internal.transform = {};
        }
        this._internal.transform.scale = [x, y, z];
        return this;
    }

    set_transform(transform: TransformInput) {
        this._internal.transform = transform;
        return this;
    }

    set_user_data_value(key: string, value: any) {
        if (!this._internal.user_data) {
            this._internal.user_data = {};
        }
        this._internal.user_data[key] = value;
        return this;
    }

    set_user_data(user_data: Record<string, any>) {
        this._internal.user_data = user_data;
        return this;
    }

    add_monitor(monitor: Monitor) {
        if (!this._internal.monitors) {
            this._internal.monitors = [];
        }
        this._internal.monitors.push(monitor);
        return this;
    }

    add_monitors(monitors: Monitor[]) {
        if (!this._internal.monitors) {
            this._internal.monitors = [];
        }
        this._internal.monitors.push(...monitors);
        return this;
    }

    set_monitors(monitors: Monitor[]) {
        this._internal.monitors = monitors;
        return this;
    }

    build(): EngineObjectDispatch {
        return EngineObjectDispatchSchema.parse(this._internal);
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
        .set_rigid_body(new DynamicRigidBodyBuilder()
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
    .add_monitor(
        // we also recieve an event when being swung faster than 5 rads/s in any direction
        new AngularVelocityMonitorBuilder("sword_swung")
            .when("any")
            .x({ min: 5 })
            .y({ min: 5 })
            .z({ min: 5 })
            .build()
    )
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
