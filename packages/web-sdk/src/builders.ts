import type { NamedReply } from "@hyperlinkvr/types";
import { AxesBasedMonitorInput, AxisRange, ButtonPrefab, ButtonPrefabInput, ButtonPrefabSchema, Collider, ColliderSchema, ControllerButtonInteraction, ControllerButtonInteractionInput, ControllerButtonInteractionSchema, ControllerButtonWhenListen, CreatedEngineObject, CustomMeshApproximation, CustomObject, CustomObjectInput, CustomObjectSchema, EngineObject, EngineObjectDispatch, EngineObjectDispatchInput, EngineObjectDispatchSchema, FollowPlayerInteraction, FollowPlayerInteractionInput, FollowPlayerInteractionSchema, GrabbableInteraction, GrabbableInteractionInput, GrabbableInteractionSchema, GrabCollider, GrabOffsetInput, HexNumericalColor, HexNumericalColorSchema, Interaction, MeshApproximation, Monitor, MonitorSchema, PhysicsSystem, PhysicsSystemInput, PhysicsSystemSchema, PrefabInput, ReportEvent, ReportEventPayload, ReportingInteractionInput, ReportingPrefabInput, RigidBody, RigidBodyInput, RigidBodySchema, RigidBodyType, TransformInput, TriggerVolumeInteraction, TriggerVolumeInteractionInput, TriggerVolumeInteractionSchema } from "@hyperlinkvr/vr-engine-schemas";



import { send_via_rtc } from "./messenger";
import { subscribe_report } from "./event_bus";


class BaseBuilder<InternalType> {
    protected _internal: InternalType;

    constructor(initial: InternalType) {
        this._internal = initial;
    }

    static from_data<B extends BaseBuilder<any>, D>(
        this: new (data?: D) => B,
        data: D
    ): B {
        const instance = new this();
        instance._internal = structuredClone(data);
        return instance;
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

    // when report_motion/collisions supported then add here

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

    set_grab_collider(collider: GrabCollider) {
        this._internal.collider = collider;
        return this;
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

export class FollowPlayerInteractionBuilder extends BaseBuilder<FollowPlayerInteractionInput> {
    constructor() {
        super({ type: "follow-player" } as FollowPlayerInteractionInput);
    }

    set_enabled(enabled: boolean) {
        this._internal.enabled = enabled;
        return this;
    }

    // if true, disabling follow will make the object obey its position coordinates rather than freezing in place. likely irrelevant for most implementations
    snaps_on_release(snap: boolean = true) {
        this._internal.snap_on_release = snap;
        return this;
    }

    build(): FollowPlayerInteractionInput {
        return FollowPlayerInteractionSchema.parse(this._internal);
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
                reporting: { name }
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

export class ButtonPrefabBuilder extends BaseBuilder<ButtonPrefabInput> {
    constructor() {
        super({ type: "prefab", name: "button" } as ButtonPrefabInput);
    }

    named(name: string) {
        this._internal.reporting = { ...this._internal.reporting, name };
        return this;
    }

    set_label(label: string) {
        this._internal.label = label;
        return this;
    }

    set_color(color: HexNumericalColor) {
        this._internal.color = HexNumericalColorSchema.parse(color);
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

    build(): ButtonPrefab {
        return ButtonPrefabSchema.parse(this._internal);
    }
}

class AxesBasedMonitorBuilder extends BaseBuilder<AxesBasedMonitorInput> {
    constructor(type: "position" | "rotation" | "linear-velocity" | "angular-velocity",) {
        super({ type });
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
    constructor() {
        super("position");
    }
}

export class RotationMonitorBuilder extends AxesBasedMonitorBuilder {
    constructor() {
        super("rotation");
    }
}

export class LinearVelocityMonitorBuilder extends AxesBasedMonitorBuilder {
    constructor() {
        super("linear-velocity");
    }
}

export class AngularVelocityMonitorBuilder extends AxesBasedMonitorBuilder {
    constructor() {
        super("angular-velocity");
    }
}

export class EngineObjectDispatchBuilder extends BaseBuilder<EngineObjectDispatchInput> {
    #callbacks = new Map<string, (event: ReportEvent) => void>();

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

    add_monitor(name: string, monitor: Monitor) {
        if (!this._internal.monitors) {
            this._internal.monitors = [];
        }
        this._internal.monitors.push({ ...monitor, reporting: { name } });
        return this;
    }

    add_monitors(monitors: {name: string, monitor: Monitor}[]) {
        if (!this._internal.monitors) {
            this._internal.monitors = [];
        }
        this._internal.monitors.push(...monitors.map(({name, monitor}) => ({ ...monitor, reporting: { name } })));
        return this;
    }

    set_monitors(monitors: {name: string, monitor: Monitor}[]) {
        this._internal.monitors = monitors.map(({name, monitor}) => ({ ...monitor, reporting: { name } }));
        return this;
    }

    on(name: string, callback: (event: ReportEvent) => void) {
        if (this.#callbacks.has(name)) {
            throw new Error(`A callback is already bound for "${name}".`);
        }
        this.#callbacks.set(name, callback);
        return this;
    }

    build(): EngineObjectDispatch {
        return EngineObjectDispatchSchema.parse(this._internal);
    }

    #bind_callbacks(dispatch: EngineObjectDispatch) {
        // every named reporting source in this dispatch, plus how to stamp its id back
        const named_sources: Array<{ name: string; assign_id: (id: string) => void }> = [];

        // find all interactions with reporting names
        if (dispatch.object.type === "custom" && dispatch.object.interactions) {
            for (const interaction of dispatch.object.interactions) {
                if ("reporting" in interaction && interaction.reporting?.name) {
                    named_sources.push({
                        name: interaction.reporting.name,
                        assign_id: (id) => {
                            interaction.reporting = { ...interaction.reporting, id };
                        }
                    });
                }
            }
        }

        // if prefab has reporting, add it
        if (dispatch.object.type === "prefab" && dispatch.object.reporting?.name) {
            const prefab_object = dispatch.object as PrefabInput;
            named_sources.push({
                name: dispatch.object.reporting.name,
                assign_id: (id) => {
                    prefab_object.reporting = { ...prefab_object.reporting, id };
                }
            });
        }

        // add any reporting monitors
        for (const monitor of dispatch.monitors ?? []) {
            if (monitor.reporting?.name) {
                named_sources.push({
                    name: monitor.reporting.name,
                    assign_id: (id) => {
                        monitor.reporting = { ...monitor.reporting, id };
                    }
                });
            }
        }

        const seen = new Set<string>();
        for (const source of named_sources) {
            if (seen.has(source.name)) {
                throw new Error(`Duplicate reporting name "${source.name}" in this dispatch.`);
            }
            seen.add(source.name);
        }

        // mint an id per bound source, stamp it into the outgoing data, subscribe
        const unsubscribes: Array<() => void> = [];
        const unbound = new Set(this.#callbacks.keys());

        for (const source of named_sources) {
            const callback = this.#callbacks.get(source.name);
            if (!callback) {
                continue; // no callback bound for this source, so don't subscribe
            }

            const id = crypto.randomUUID();
            source.assign_id(id);

            unsubscribes.push(subscribe_report(id, callback));

            unbound.delete(source.name);
        }

        if (unbound.size > 0) {
            for (const unsubscribe of unsubscribes) unsubscribe();
            const missing = [...unbound].map((name) => `"${name}"`).join(", ");
            throw new Error(`No reporting source named ${missing} in this dispatch.`);
        }

        return unsubscribes;
    }

    async create(): Promise<{object: CreatedEngineObject, destroy: () => Promise<void> }> {
        const built_object = this.build();
        const unsubscribes = this.#bind_callbacks(built_object);

        try {
            const created = (await send_via_rtc({
                action: "HVRSDK_CREATE_ENGINE_OBJECT",
                object: built_object
            })) as NamedReply<"HVRSDK_CREATE_ENGINE_OBJECT">;
            // TODO: handle timeouts and errors

            let burned = false;
            return {
                object: created.object,
                destroy: async () => {
                    if (burned) {
                        throw new Error("This object has already been destroyed.");
                    }

                    burned = true;

                    for (const unsubscribe of unsubscribes) {
                        unsubscribe();
                    }

                    // TODO: implement
                    // await send_via_rtc({
                    //     action: "HVRSDK_DESTROY_ENGINE_OBJECT",
                    //     object_id: created.object.id
                    // });
                }
            }
        } catch (e) {
            for (const unsubscribe of unsubscribes) {
                unsubscribe();
            }

            throw e;
        }
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
    .add_interaction("grab", new GrabbableInteractionBuilder()
        .reports_grabs() // now recieves events when object grabbed
        .build()
    )
    .build();

const created_sword = await new EngineObjectDispatchBuilder()
    .set_object(sword)
    .set_position(0, 1, -2)
    .add_monitor(
        // we also recieve an event when being swung faster than 5 rads/s in any direction
        "swung",
        new AngularVelocityMonitorBuilder()
            .when("any")
            .x({ min: 5 })
            .y({ min: 5 })
            .z({ min: 5 })
            .build()
    )
    .on("grab", (event) => console.log("grabbed", event.object_id))
    .on("swung", () => console.log("swung"))
    .create();

console.log("Created sword object with ID:", created_sword.id);
 */

// example usage for button prefab:
/*
const button = new ButtonPrefabBuilder()
    .named("my_button")
    .set_label("Press Me")
    .set_color(0xff0000)
    .build();

const created_button = await new EngineObjectDispatchBuilder()
    .set_object(button)
    .set_position(1, 1, -2)
    .on("my_button", (event) => console.log("button event:", event))
    .create();

console.log("Created button object with ID:", created_button.id);
*/
