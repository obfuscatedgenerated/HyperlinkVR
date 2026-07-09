import {
    CreatedEngineObject,
    EngineObject,
    EngineObjectDispatch,
    EngineObjectDispatchInput,
    EngineObjectDispatchSchema,
    EngineObjectModification,
    EngineObjectModificationInput,
    EngineObjectModificationSchema,
    Monitor,
    PartialTransformInput,
    PrefabInput,
    ReportEvent,
    TransformInput,
    TweenEasingInput,
    TweenSchema
} from "@hyperlinkvr/vr-engine-schemas";
import {BaseBuilder} from "./base";
import {subscribe_report} from "../event_bus";
import {send_via_rtc} from "../messenger";
import type {NamedReply} from "@hyperlinkvr/types";

export interface EngineObjectCreationResult {
    object: CreatedEngineObject;
    destroy: () => Promise<void>;
    modify: () => EngineObjectModificationBuilder;
    refresh: () => Promise<void>;
}

class EngineObjectModificationBuilder extends BaseBuilder<EngineObjectModificationInput> {
    //#source: EngineObjectCreationResult;
    #burned = false;

    //constructor(source: EngineObjectCreationResult) {
    //super({ id: source.object.id } as EngineObjectModificationInput);
    //this.#source = source;
    //}
    constructor(id: string) {
        super({id} as EngineObjectModificationInput);
    }

    set_position(x: number, y: number, z: number) {
        if (this.#burned) {
            throw new Error("This modification builder has already been applied.");
        }

        if (!this._internal.transform) {
            this._internal.transform = {};
        }
        this._internal.transform.position = [x, y, z];
        return this;
    }

    set_euler_rotation(x: number, y: number, z: number) {
        if (this.#burned) {
            throw new Error("This modification builder has already been applied.");
        }

        if (!this._internal.transform) {
            this._internal.transform = {};
        }
        this._internal.transform.rotation = [x, y, z];
        return this;
    }

    set_quaternion_rotation(x: number, y: number, z: number, w: number) {
        if (this.#burned) {
            throw new Error("This modification builder has already been applied.");
        }

        if (!this._internal.transform) {
            this._internal.transform = {};
        }
        this._internal.transform.rotation = [x, y, z, w];
        return this;
    }

    set_scale(x: number, y: number, z: number) {
        if (this.#burned) {
            throw new Error("This modification builder has already been applied.");
        }

        if (!this._internal.transform) {
            this._internal.transform = {};
        }
        this._internal.transform.scale = [x, y, z];
        return this;
    }

    set_transform(transform: PartialTransformInput) {
        if (this.#burned) {
            throw new Error("This modification builder has already been applied.");
        }

        this._internal.transform = transform;
        return this;
    }

    set_user_data_value(key: string, value: any) {
        if (this.#burned) {
            throw new Error("This modification builder has already been applied.");
        }

        if (!this._internal.user_data) {
            this._internal.user_data = {};
        }
        this._internal.user_data[key] = value;
        return this;
    }

    set_user_data(user_data: Record<string, any>) {
        if (this.#burned) {
            throw new Error("This modification builder has already been applied.");
        }

        this._internal.user_data = user_data;
        return this;
    }

    add_monitor(name: string, monitor: Monitor) {
        if (this.#burned) {
            throw new Error("This modification builder has already been applied.");
        }

        if (!this._internal.monitors) {
            this._internal.monitors = [];
        }

        this._internal.monitors.push({...monitor, reporting: {name}});
    }

    remove_monitors(name: string) {
        if (this.#burned) {
            throw new Error("This modification builder has already been applied.");
        }

        if (!this._internal.monitors) {
            throw new Error("No monitors to remove.");
        }

        // multiple monitors are allowed to have the same name, so remove all with that name but check if any were actually removed
        const original_length = this._internal.monitors.length;
        this._internal.monitors = this._internal.monitors.filter((monitor) => monitor.reporting?.name !== name);

        if (this._internal.monitors.length === original_length) {
            throw new Error(`No monitors were found with name "${name}".`);
        }
    }

    add_monitors(monitors: { name: string, monitor: Monitor }[]) {
        if (this.#burned) {
            throw new Error("This modification builder has already been applied.");
        }

        if (!this._internal.monitors) {
            this._internal.monitors = [];
        }

        this._internal.monitors.push(...monitors.map(({name, monitor}) => ({...monitor, reporting: {name}})));
    }

    build(): EngineObjectModification {
        return EngineObjectModificationSchema.parse(this._internal);
    }

    async apply(): Promise<void> {
        if (this.#burned) {
            throw new Error("This modification builder has already been applied.");
        }

        const built_modification = this.build();
        this.#burned = true;
        await send_via_rtc({
            action: "HVRSDK_MODIFY_ENGINE_OBJECT",
            object_id: this._internal.id,
            changes: built_modification,
        });

        // // apply the changes to the cached object
        // this.#source.object = Object.freeze({
        //     ...this.#source.object,
        //     transform: {
        //         ...this.#source.object.transform,
        //         ...built_modification.transform
        //     },
        //     user_data: {
        //         ...this.#source.object.user_data,
        //         ...built_modification.user_data
        //     }
        // });
    }

    async tween(duration_ms: number, easing?: TweenEasingInput) {
        if (this.#burned) {
            throw new Error("This modification builder has already been applied.");
        }

        if (this._internal.user_data || this._internal.monitors) {
            throw new Error("Only transform changes may be tweened");
        }

        const built_modification = this.build();
        const tween = TweenSchema.parse({
            ms: duration_ms,
            easing,
        });

        this.#burned = true;
        await send_via_rtc({
            action: "HVRSDK_MODIFY_ENGINE_OBJECT",
            object_id: this._internal.id,
            changes: built_modification,
            tween
        });

        // // could tween the changes to the cached object, for now just wait for the delay then apply the final state
        // await new Promise((resolve) => setTimeout(resolve, duration_ms));
        //
        // this.#source.object = Object.freeze({
        //     ...this.#source.object,
        //     transform: {
        //         ...this.#source.object.transform,
        //         ...built_modification.transform
        //     },
        //     user_data: {
        //         ...this.#source.object.user_data,
        //         ...built_modification.user_data
        //     }
        // });
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
        this._internal.monitors.push({...monitor, reporting: {name}});
        return this;
    }

    add_monitors(monitors: { name: string, monitor: Monitor }[]) {
        if (!this._internal.monitors) {
            this._internal.monitors = [];
        }
        this._internal.monitors.push(...monitors.map(({name, monitor}) => ({...monitor, reporting: {name}})));
        return this;
    }

    set_monitors(monitors: { name: string, monitor: Monitor }[]) {
        this._internal.monitors = monitors.map(({name, monitor}) => ({...monitor, reporting: {name}}));
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
                            interaction.reporting = {...interaction.reporting, id};
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
                    prefab_object.reporting = {...prefab_object.reporting, id};
                }
            });
        }

        // add any reporting monitors
        for (const monitor of dispatch.monitors ?? []) {
            if (monitor.reporting?.name) {
                named_sources.push({
                    name: monitor.reporting.name,
                    assign_id: (id) => {
                        monitor.reporting = {...monitor.reporting, id};
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

    async create(): Promise<EngineObjectCreationResult> {
        const built_object = this.build();
        const unsubscribes = this.#bind_callbacks(built_object);

        try {
            const created = (await send_via_rtc({
                action: "HVRSDK_CREATE_ENGINE_OBJECT",
                object: built_object
            })) as NamedReply<"HVRSDK_CREATE_ENGINE_OBJECT">;
            // TODO: handle timeouts and errors

            let burned = false;
            const ret_val = {
                object: Object.freeze(created.object),
                destroy: async () => {
                    if (burned) {
                        throw new Error("This object has already been destroyed.");
                    }

                    burned = true;

                    for (const unsubscribe of unsubscribes) {
                        unsubscribe();
                    }

                    await send_via_rtc({
                        action: "HVRSDK_DESTROY_ENGINE_OBJECT",
                        object_id: created.object.id
                    });
                },
                modify: () => {
                    if (burned) {
                        throw new Error("This object has already been destroyed.");
                    }

                    return new EngineObjectModificationBuilder(created.object.id);
                },
                refresh: async () => {
                    if (burned) {
                        throw new Error("This object has already been destroyed.");
                    }

                    const refreshed = (await send_via_rtc({
                        action: "HVRSDK_REFRESH_ENGINE_OBJECT",
                        object_id: created.object.id
                    })) as NamedReply<"HVRSDK_REFRESH_ENGINE_OBJECT">;

                    ret_val.object = Object.freeze(refreshed.object);
                }
            }

            return ret_val;
        } catch (e) {
            for (const unsubscribe of unsubscribes) {
                unsubscribe();
            }

            throw e;
        }
    }
}
