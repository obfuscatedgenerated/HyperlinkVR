import type { WindowArguments, WindowIntent } from "./windowing";


interface BaseMessage {

}


interface BaseActionMessage extends BaseMessage {
    action: string;
}

interface BaseEventMessage extends BaseMessage {
    type: string;
}


interface StartStreamAction extends BaseActionMessage {
    action: "VVR_START_STREAM";
    tab: number; // TODO: subscription based routing, what the hell is a tab (says a non-browser)!
}

interface LaunchAction extends BaseActionMessage {
    action: "VVR_LAUNCH";
    tab: number; // TODO sbr
}

interface ClickAction extends BaseActionMessage {
    action: "VVR_CLICK";
    pos: { x: number; y: number };
    button?: 0 | 1 | 2;
}

interface CreateWindowAction extends BaseActionMessage {
    action: "VVR_CREATE_WINDOW";
    intent: WindowIntent;
    args?: WindowArguments;
    type?: "popup" | "normal";
    width?: number;
    height?: number;
}

export type ActionMessage =
    StartStreamAction |
    LaunchAction |
    ClickAction |
    CreateWindowAction;


interface StreamEvent extends BaseEventMessage {
    type: "VVR_STREAM";
    stream: number;
    tab: number; // TODO sbr
}

interface DimensionsUpdateEvent extends BaseEventMessage {
    type: "VVR_DIMENSIONS_UPDATE";
    tab: number; // TODO sbr
    width: number;
    height: number;
}

interface URLUpdateEvent extends BaseEventMessage {
    type: "VVR_URL_UPDATE";
    tab: number; // TODO sbr
    url: string;
}

interface TabClosedEvent extends BaseEventMessage { // TODO: rename to sessionclosed
    type: "VVR_TAB_CLOSED";
    tab: number; // TODO sbr
}

export type EventMessage =
    StreamEvent |
    DimensionsUpdateEvent |
    URLUpdateEvent |
    TabClosedEvent;

export type Message = ActionMessage | EventMessage;

// TODO: message targeting? will it still exist and how will it work with sbr?
