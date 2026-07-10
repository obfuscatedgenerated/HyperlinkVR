import {BaseBuilder} from "./base";
import {
    Collider,
    ControllerButtonInteraction,
    ControllerButtonInteractionInput,
    ControllerButtonInteractionSchema,
    ControllerButtonWhenListen,
    FollowPlayerInteractionInput,
    FollowPlayerInteractionSchema, GlobalAudioInteraction, GlobalAudioInteractionInput, GlobalAudioInteractionSchema,
    GrabbableInteraction,
    GrabbableInteractionInput,
    GrabbableInteractionSchema,
    GrabCollider,
    GrabOffsetInput, PositionalAudioInteraction, PositionalAudioInteractionInput, PositionalAudioInteractionSchema,
    TriggerVolumeInteraction,
    TriggerVolumeInteractionInput,
    TriggerVolumeInteractionSchema
} from "@hyperlinkvr/vr-engine-schemas";
import {send_via_rtc} from "../messenger";

const interaction_command = async (object_id: string, interaction_id: string, command: string, args?: any) => {
    try {
        const res = await send_via_rtc({
            action: "HVRSDK_INTERACTION_COMMAND",
            object_id,
            interaction_id,
            command,
            args
        });

        if ("response" in res) {
            return res.response;
        } else {
            return undefined;
        }
    } catch (err) {
        console.error("Error sending interaction command:", err);
        throw err;
    }
}

export type InteractionMakeAPIFunc = (object_id: string, interaction_id: string) => any;

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


    // TODO: set enabled/disabled, api to change that, api to eject
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
        super({type: "trigger-volume"} as TriggerVolumeInteractionInput);
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
        super({type: "follow-player"} as FollowPlayerInteractionInput);
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


    static _make_api(object_id: string, interaction_id: string) {
        return {
            set_enabled: async (enabled: boolean) => {
                return await interaction_command(object_id, interaction_id, "set_enabled", {enabled});
            }
        }
    }
}

export class PositionalAudioInteractionBuilder extends BaseBuilder<PositionalAudioInteractionInput> {
    constructor() {
        super({type: "positional-audio"} as PositionalAudioInteractionInput);
    }

    set_url(url: string) {
        this._internal.url = url;
        return this;
    }

    set_max_distance(distance: number) {
        this._internal.max_distance = distance;
        return this;
    }

    set_offset(offset: [number, number, number]) {
        this._internal.offset = offset;
        return this;
    }

    loop(loop = true) {
        this._internal.loop = loop;
        return this;
    }

    autoplay(autoplay = true) {
        this._internal.autoplay = autoplay;
        return this;
    }

    build(): PositionalAudioInteraction {
        return PositionalAudioInteractionSchema.parse(this._internal);
    }


    static _make_api(object_id: string, interaction_id: string) {
        return {
            play: async () => {
                return await interaction_command(object_id, interaction_id, "play");
            },
            pause: async () => {
                return await interaction_command(object_id, interaction_id, "pause");
            },
            stop: async () => {
                return await interaction_command(object_id, interaction_id, "stop");
            },
            seek: async (offset: number) => {
                return await interaction_command(object_id, interaction_id, "seek", {offset});
            },
            is_playing: async () => {
                return await interaction_command(object_id, interaction_id, "is_playing");
            },
            set_loop: async (loop: boolean) => {
                return await interaction_command(object_id, interaction_id, "set_loop", {loop});
            },
            set_max_distance: async (max_distance: number) => {
                return await interaction_command(object_id, interaction_id, "set_max_distance", {max_distance});
            },
            set_offset: async (offset: [number, number, number]) => {
                return await interaction_command(object_id, interaction_id, "set_offset", {offset});
            }
        }
    }
}

export class GlobalAudioInteractionBuilder extends BaseBuilder<GlobalAudioInteractionInput> {
    constructor() {
        super({type: "global-audio"} as GlobalAudioInteractionInput);
    }

    set_url(url: string) {
        this._internal.url = url;
        return this;
    }

    set_volume(volume: number) {
        this._internal.volume = volume;
        return this;
    }

    loop(loop = true) {
        this._internal.loop = loop;
        return this;
    }

    autoplay(autoplay = true) {
        this._internal.autoplay = autoplay;
        return this;
    }

    build(): GlobalAudioInteraction {
        return GlobalAudioInteractionSchema.parse(this._internal);
    }


    static _make_api(object_id: string, interaction_id: string) {
        return {
            play: async () => {
                return await interaction_command(object_id, interaction_id, "play");
            },
            pause: async () => {
                return await interaction_command(object_id, interaction_id, "pause");
            },
            stop: async () => {
                return await interaction_command(object_id, interaction_id, "stop");
            },
            seek: async (offset: number) => {
                return await interaction_command(object_id, interaction_id, "seek", {offset});
            },
            is_playing: async () => {
                return await interaction_command(object_id, interaction_id, "is_playing");
            },
            set_volume: async (volume: number) => {
                return await interaction_command(object_id, interaction_id, "set_volume", {volume});
            },
            set_loop: async (loop: boolean) => {
                return await interaction_command(object_id, interaction_id, "set_loop", {loop});
            }
        }
    }
}

export const INTERACTION_API_MAKERS = {
    "follow-player": FollowPlayerInteractionBuilder._make_api,
    "positional-audio": PositionalAudioInteractionBuilder._make_api,
    "global-audio": GlobalAudioInteractionBuilder._make_api
} as Record<string, InteractionMakeAPIFunc>;
