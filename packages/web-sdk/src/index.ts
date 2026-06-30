export {version} from "../package.json";

export * as auth from "./auth";

import {facilitate_rtc} from "./messenger";

export const connect = async () => {
    return facilitate_rtc();
}
