export interface ReportEventEnvelope<TKind extends string, TPayload> {
    source_id: string; // interaction or monitor id
    object_id: string; // owning object
    kind: TKind; // discriminator
    ts: number; // host-side event time
    payload: TPayload;
}

interface InteractedHand {
    part: "hand";
    handedness: "left" | "right";
}

interface InteractedHeadOrTorso {
    part: "head" | "torso";
}

type InteractedBodyPart = InteractedHand | InteractedHeadOrTorso;

type InteractedPlayer = InteractedBodyPart & {
    type: "player"
}

interface InteractedObject {
    type: "object";
    object_id: string;
    tags: string[];
}

export interface TriggerVolumeInteractionPayload {
    type: "enter" | "exit";
    interacted: InteractedPlayer | InteractedObject;
}
// TODO: support other objects entering

export interface ControllerButtonInteractionPayload {
    type: "press" | "release";
    button: string;
}

export interface GrabInteractionPayload {
    type: "grab" | "release" | "proximity";
    handedness: "left" | "right";
}

export interface AxesMonitorPayload {
    axes: ("x" | "y" | "z")[];
    values: { x: number; y: number; z: number };
}

export interface BasketballHoopPrefabPayload {
    type: "scored"
    object_id?: string;
}

export type ReportEventPayload = TriggerVolumeInteractionPayload | ControllerButtonInteractionPayload | GrabInteractionPayload | AxesMonitorPayload;

export type ReportEvent =
    | ReportEventEnvelope<"trigger-volume", TriggerVolumeInteractionPayload>
    | ReportEventEnvelope<"controller-button", ControllerButtonInteractionPayload>
    | ReportEventEnvelope<"grab", GrabInteractionPayload>
    | ReportEventEnvelope<"pos-monitor", AxesMonitorPayload>
    | ReportEventEnvelope<"rot-monitor", AxesMonitorPayload>
    | ReportEventEnvelope<"lin-vel-monitor", AxesMonitorPayload>
    | ReportEventEnvelope<"ang-vel-monitor", AxesMonitorPayload>
    | ReportEventEnvelope<"basketball-hoop-prefab", BasketballHoopPrefabPayload>
