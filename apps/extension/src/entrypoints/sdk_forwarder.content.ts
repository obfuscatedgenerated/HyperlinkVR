import { defineContentScript } from "#imports";

import { URL_PATTERNS } from "~/util/url_patterns";

import type {WebSDKActionMessage} from "@viewportvr/core";

export default defineContentScript({
    matches: URL_PATTERNS,
    main() {
        window.addEventListener("message", (event) => {
            const sdk_message = event.data as WebSDKActionMessage;

            // only forward sdk messages
            if (sdk_message && sdk_message.action && sdk_message.action.startsWith("SDK_")) {
                chrome.runtime.sendMessage(sdk_message);
            }

            // TODO: how will responses work
        });
    }
});
