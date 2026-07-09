import {BaseBuilder} from "./base";
import {
    Collider,
    ControllerButtonInteraction,
    ControllerButtonInteractionInput,
    ControllerButtonInteractionSchema,
    ControllerButtonWhenListen,
    FollowPlayerInteractionInput,
    FollowPlayerInteractionSchema,
    GrabbableInteraction,
    GrabbableInteractionInput,
    GrabbableInteractionSchema,
    GrabCollider,
    GrabOffsetInput,
    TriggerVolumeInteraction,
    TriggerVolumeInteractionInput,
    TriggerVolumeInteractionSchema
} from "@hyperlinkvr/vr-engine-schemas";

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
}
