export interface ReportEventEnvelope<TKind extends string, TPayload> {
    source_id: string; // interaction or monitor id
    object_id: string; // owning object
    kind: TKind; // discriminator
    ts: number; // host-side event time
    payload: TPayload;
}

export interface TriggerVolumeInteractionPayload {
    type: "enter" | "exit";
    part: "hand" | "torso" | "head";
    handedness?: "left" | "right";
}

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

export type ReportEventPayload = TriggerVolumeInteractionPayload | ControllerButtonInteractionPayload | GrabInteractionPayload | AxesMonitorPayload;

export type ReportEvent =
    | ReportEventEnvelope<"trigger-volume", TriggerVolumeInteractionPayload>
    | ReportEventEnvelope<"controller-button", ControllerButtonInteractionPayload>
    | ReportEventEnvelope<"grab", GrabInteractionPayload>
    | ReportEventEnvelope<"pos-monitor", AxesMonitorPayload>
    | ReportEventEnvelope<"rot-monitor", AxesMonitorPayload>
    | ReportEventEnvelope<"lin-vel-monitor", AxesMonitorPayload>
    | ReportEventEnvelope<"ang-vel-monitor", AxesMonitorPayload>;
