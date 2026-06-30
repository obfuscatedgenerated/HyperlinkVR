export {version} from "../package.json";

export * as auth from "./auth";

import {facilitate_rtc} from "./messenger";

export const connect = async () => {
    return facilitate_rtc();
}

// TODO: way to ask the extension if the host is already ready (might need state, if not just send a message and see if it gets a reply ig)
