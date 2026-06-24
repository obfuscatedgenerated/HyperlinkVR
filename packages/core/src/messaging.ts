import type { ActionMessage, EventMessage } from "./message_defs";

export interface MessageChannel<Tx = ActionMessage, Rx = EventMessage> {
    send(payload: Tx): Promise<Rx>;

    listen(handler: (payload: Rx) => Promise<Tx> | void): () => void;

    on_disconnect(handler: () => void): () => void;

    disconnect(): void;
}

export interface MessageEngine {
    // one off messages
    send<Tx = ActionMessage>(action: Tx): Promise<void>;

    // returns a function to remove the listener
    listen<Rx = EventMessage>(
        handler: (event: Rx) => Promise<void> | void
    ): () => void;

    // long-lived connections
    connect<Tx, Rx>(channel_name: string): MessageChannel<Tx, Rx>;

    // returns a function to remove the listener
    on_connect<Tx, Rx>(
        channel_name: string,
        handler: (channel: MessageChannel<Rx, Tx>) => void
    ): () => void;
}
