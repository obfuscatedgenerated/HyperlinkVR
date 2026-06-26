import { defineContentScript } from "#imports";

import { URL_PATTERNS } from "~/util/url_patterns";

import * as sdk from "@viewportvr/web-sdk";

export default defineContentScript({
    matches: URL_PATTERNS,
    world: "MAIN",
    main() {
        (globalThis as any).viewportvr = sdk;

        // TODO: opt out with well-known data
    }
});
