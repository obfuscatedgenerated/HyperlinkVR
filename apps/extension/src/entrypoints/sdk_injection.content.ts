import { defineContentScript } from "#imports";

import { URL_PATTERNS } from "~/util/url_patterns";

import * as sdk from "@hyperlinkvr/web-sdk";

export default defineContentScript({
    matches: URL_PATTERNS,
    world: "MAIN",
    runAt: "document_start",
    main() {
        Object.defineProperty(window, "hyperlinkvr", {
            value: sdk,
            writable: false,
            configurable: false,
        });

        // TODO: opt out with well-known data
    }
});
