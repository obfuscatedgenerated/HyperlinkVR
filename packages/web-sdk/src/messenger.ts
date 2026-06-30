import type { WebSDKActionMessage, WebSDKReplyMessage, WithCorrelation } from "@hyperlinkvr/types";


let rtc_data_channel: RTCDataChannel | null = null;
export const send_via_messaging = async (
    message: WebSDKActionMessage
): Promise<WebSDKReplyMessage> => {
    const correlation_id = crypto.randomUUID();
    const message_with_correlation: WithCorrelation<WebSDKActionMessage> = {
        ...message,
        correlation_id
    };

    return new Promise((resolve, reject) => {
        const handle_message = (event: MessageEvent) => {
            const data = event.data as any;
            // TODO: should this check for HVRSDK prefix?
            if (
                "for" in data &&
                data.for === message.action &&
                "correlation_id" in data &&
                data.correlation_id === correlation_id
            ) {
                window.removeEventListener("message", handle_message);

                const { correlation_id, ...without_correlation } = data;
                resolve(without_correlation);
            }
        };

        window.addEventListener("message", handle_message);
        window.postMessage(message_with_correlation, "*");
    });
};

export const facilitate_rtc = async () => {
    const peer_connection = new RTCPeerConnection({ iceServers: [] });

    peer_connection.onicecandidate = (event) => {
        if (event.candidate) {
            send_via_messaging({
                action: "HVRSDK_RTC_ICE_CANDIDATE",
                candidate: event.candidate
            });
        }
    };

    const listener = async (event: MessageEvent) => {
        const data = event.data as any;

        // technically breaking how for works but doesnt matter since this is a special case
        if (data.for === "HVRSDK_RTC_OFFER") {
            const offer = new RTCSessionDescription(data.offer);
            await peer_connection.setRemoteDescription(offer);

            const answer = await peer_connection.createAnswer();
            await peer_connection.setLocalDescription(answer);

            send_via_messaging({
                action: "HVRSDK_RTC_ANSWER",
                answer: answer
            });
        } else if (data.action === "HVRSDK_RTC_ICE_CANDIDATE") {
            const candidate = new RTCIceCandidate(data.candidate);
            await peer_connection.addIceCandidate(candidate);
        }
    };

    window.addEventListener("message", listener);

    return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
            console.error("RTC connection request timed out");
            reject(new Error("RTC connection request timed out"));
        }, 5000);

        peer_connection.ondatachannel = (event) => {
            rtc_data_channel = event.channel;

            rtc_data_channel.onopen = () => {
                console.log("RTC data channel opened");
                clearTimeout(timeout);
                window.removeEventListener("message", listener);
                resolve();
            };
            rtc_data_channel.onclose = () => {
                console.log("RTC data channel closed");
                rtc_data_channel = null;
            };
        };

        send_via_messaging({ action: "HVRSDK_RTC_REQUEST" }).catch((err) => {
            console.error("Failed to request RTC connection:", err);
            reject(err);
        });
    });
};


export const send_via_rtc = async (
    message: WebSDKActionMessage
): Promise<WebSDKReplyMessage> => {
    if (!rtc_data_channel || rtc_data_channel.readyState !== "open") {
        throw new Error("RTC data channel is not open");
    }

    const correlation_id = crypto.randomUUID();
    const message_with_correlation: WithCorrelation<WebSDKActionMessage> = {
        ...message,
        correlation_id
    };

    return new Promise((resolve, reject) => {
        const handle_message = (event: MessageEvent) => {
            const data = JSON.parse(event.data) as any;
            if (
                "for" in data &&
                data.for === message.action &&
                "correlation_id" in data &&
                data.correlation_id === correlation_id
            ) {
                rtc_data_channel?.removeEventListener("message", handle_message);

                const { correlation_id, ...without_correlation } = data;
                resolve(without_correlation);
            }
        };

        rtc_data_channel!.addEventListener("message", handle_message);
        rtc_data_channel!.send(JSON.stringify(message_with_correlation));
    });
};

export const send = async (
    message: WebSDKActionMessage
): Promise<WebSDKReplyMessage> => {
    if (!rtc_data_channel || rtc_data_channel.readyState !== "open") {
        return send_via_messaging(message);
    }

    return send_via_rtc(message);
};
