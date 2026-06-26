import type { WebSDKActionMessage } from "@viewportvr/core";

export const send = (message: WebSDKActionMessage) => {
    window.postMessage(message, "*");
}
