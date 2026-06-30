import { useMessageEngine, useStorageEngines, useTabSession } from "@hyperlinkvr/react";
import { NamedAction, NamedReply, WebSDKActionMessage, WebSDKActionName, WebSDKEventMessage } from "@hyperlinkvr/types";
import { builtin_handlers, Handler } from "@hyperlinkvr/web-sdk-handlers";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";





interface WebSDKMessagingContextType {
    on_action: <M extends WebSDKActionName>(action_filter?: M) => Promise<{
        message: NamedAction<M>;
        reply: (message: NamedReply<M>) => void;
        unlisten: () => void;
    }>;

    emit_event: (message: WebSDKEventMessage) => void;

    connected: boolean;
}

// TODO: how to deal with multiple tabs at once? for now just assume a single connection at a time and check it matches the url we expect

const WebSDKMessagingContext = createContext<WebSDKMessagingContextType | null>(null);

export const WebSDKMessagingProvider = ({children}: {children: React.ReactNode}) => {
    const messenger = useMessageEngine();

    const {id, url} = useTabSession();

    const peer_connection_ref = useRef<RTCPeerConnection | null>(null);
    const data_channel_ref = useRef<RTCDataChannel | null>(null);
    const [connected, setConnected] = useState(false);

    // TODO: this code kinda sucks, same for how the background handles it. but it works :)

    useEffect(() => {
        let unlisten: (() => void) | null = null;

        // listen for VVRSDK_RTC_REQUEST messages from the correct url. if we get one, start initiating a connection and send an offer back to the page
        const handle_message = async (data: WebSDKActionMessage) => {
            if (!("url" in data) || data.url !== url) {
                return;
            } else if (data.action === "HVRSDK_RTC_REQUEST") {
                const pc = new RTCPeerConnection({ iceServers: [] });
                peer_connection_ref.current = pc;

                pc.onicecandidate = (event) => {
                    if (event.candidate) {
                        messenger.send({
                            target: "cs",
                            tab: id,
                            action: "HVRSDK_RTC_ICE_CANDIDATE",
                            candidate: event.candidate
                        });
                    }
                };

                // make data channel
                const data_channel = peer_connection_ref.current.createDataChannel("web-sdk");
                data_channel_ref.current = data_channel;

                data_channel.onopen = () => {
                    console.log("Data channel open");
                    setConnected(true);

                    if (unlisten) {
                        unlisten();
                        unlisten = null;
                    }
                };

                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);

                messenger.send({
                    target: "cs",
                    tab: id,
                    for: "HVRSDK_RTC_OFFER",
                    offer
                });
            } else if (data.action === "HVRSDK_RTC_ICE_CANDIDATE") {
                if (peer_connection_ref.current) {
                    const candidate = new RTCIceCandidate(data.candidate);
                    await peer_connection_ref.current.addIceCandidate(candidate);
                }
            } else if (data.action === "HVRSDK_RTC_ANSWER") {
                if (peer_connection_ref.current) {
                    const answer = new RTCSessionDescription(data.answer);
                    await peer_connection_ref.current.setRemoteDescription(answer);
                }
            }
        };

        unlisten = messenger.listen(handle_message);

        return () => {
            if (unlisten) {
                unlisten();
                unlisten = null;
            }

            setConnected(false);

            if (data_channel_ref.current) {
                data_channel_ref.current.close();
                data_channel_ref.current = null;
            }

            if (peer_connection_ref.current) {
                peer_connection_ref.current.close();
                peer_connection_ref.current = null;
            }
        };
    }, [url]);

    const storage = useStorageEngines();

    const action_map_ref = useRef<Map<WebSDKActionName, Set<(message: NamedAction<any>, reply: (message: NamedReply<any>) => void) => void>>>(new Map());
    useEffect(() => {
        // add built in handlers
        for (const action_name in builtin_handlers) {
            const handler = (message: NamedAction<any>, reply: (message: NamedReply<any>) => void) => {
                const handler_fn = builtin_handlers[action_name as WebSDKActionName] as Handler<any>;
                handler_fn({ message, storage }).then((response) => {
                    if (response) {
                        reply(response);
                    }
                }).catch((error) => {
                    console.error("Error handling SDK message:", message, "Error:", error);
                    //@ts-ignore
                    reply({ error: error.message || "Unknown error" });
                });
            }

            const handlers = action_map_ref.current.get(action_name as WebSDKActionName) || new Set();
            handlers.add(handler);
            action_map_ref.current.set(action_name as WebSDKActionName, handlers);
        }

        return () => {
            action_map_ref.current.clear();
        };
    }, []);

    const on_action = useCallback(
        async <M extends WebSDKActionName>(action_filter?: M) => {
            return new Promise<{
                message: NamedAction<M>;
                reply: (message: NamedReply<M>) => void;
                unlisten: () => void;
            }>((resolve) => {
                const handler = <K extends WebSDKActionName>(message: NamedAction<K>, reply: (message: NamedReply<K>) => void) => {
                    if (!action_filter || message.action === action_filter) {
                        resolve({
                            message,
                            reply,
                            unlisten: () => {
                                const handlers = action_map_ref.current.get(message.action);
                                if (handlers) {
                                    handlers.delete(handler);
                                }
                            }
                        });
                    }
                };

                const handlers = action_map_ref.current.get(action_filter || "HVRSDK_AUTH_QUERY") || new Set();
                handlers.add(handler);
                action_map_ref.current.set(action_filter || "HVRSDK_AUTH_QUERY", handlers);
            });
        }
    , []);

    const emit_event = useCallback((message: WebSDKEventMessage) => {
        if (!peer_connection_ref.current || !data_channel_ref.current || data_channel_ref.current.readyState !== "open") {
            throw new Error("No connection established");
        }

        data_channel_ref.current.send(JSON.stringify(message));
    }, []);

    useEffect(() => {
        if (!peer_connection_ref.current || !data_channel_ref.current) {
            return;
        }

        const data_channel = data_channel_ref.current;

        const handle_message = (event: MessageEvent) => {
            const data = JSON.parse(event.data) as any;
            if ("action" in data) {
                const handlers = action_map_ref.current.get(data.action);
                if (handlers) {
                    handlers.forEach((handler) => {
                        handler(data, (reply_message: NamedReply<any>) => {
                            data_channel.send(JSON.stringify(reply_message));
                        });
                    });
                }
            }
        };

        data_channel.addEventListener("message", handle_message);
        return () => {
            data_channel.removeEventListener("message", handle_message);
        };
    }, [connected]);

    return (
        <WebSDKMessagingContext.Provider value={{ on_action, emit_event, connected }}>
            {children}
        </WebSDKMessagingContext.Provider>
    );
}

export const useWebSDKMessaging = () => {
    const context = useContext(WebSDKMessagingContext);
    if (!context) {
        throw new Error("useWebSDKMessaging must be used within a WebSDKMessagingProvider");
    }
    return context;
}
