export interface MessageChannel<Tx = any, Rx = any> {
    send(payload: Tx): Promise<Rx>;

    listen(handler: (payload: Rx) => Promise<Tx> | void): () => void;

    on_disconnect(handler: () => void): () => void;

    disconnect(): void;
}

export interface MessageEngine {
    // one off messages
    send<Req, Res>(payload: Req): Promise<Res>;

    // returns a function to remove the listener
    listen<Req, Res>(
        handler: (payload: Req) => Promise<Res> | void
    ): () => void;

    // long-lived connections
    connect<Tx, Rx>(channel_name: string): MessageChannel<Tx, Rx>;

    // returns a function to remove the listener
    on_connect<Tx, Rx>(
        channel_name: string,
        handler: (channel: MessageChannel<Rx, Tx>) => void
    ): () => void;
}
