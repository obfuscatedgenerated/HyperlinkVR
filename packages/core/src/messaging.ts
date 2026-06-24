export interface MessageChannel<Tx = any, Rx = any> {
    postMessage(msg: Tx): void;

    onMessage(handler: (msg: Rx) => void): () => void;

    onDisconnect(handler: () => void): () => void;

    disconnect(): void;
}

export interface MessageEngine {
    // one off messages
    send<Req, Res>(target: string, payload: Req): Promise<Res>;
    listen<Req, Res>(
        action: string,
        handler: (payload: Req) => Promise<Res> | void
    ): () => void;

    // long-lived connections
    connect<Tx, Rx>(channelName: string): MessageChannel<Tx, Rx>;
    onConnect<Tx, Rx>(
        channelName: string,
        handler: (channel: MessageChannel<Rx, Tx>) => void
    ): () => void;
}
