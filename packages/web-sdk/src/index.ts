export {version} from "../package.json";

export * as auth from "./auth";
export * as builders from "./builders";

import {facilitate_rtc} from "./messenger";

export const connect = async () => {
    return facilitate_rtc();
}

export const bind_messages = () => {
    console.log("Binding messages for HyperlinkVR Web SDK");

    // on recieving HVRSDK_READY event, dispatch DOM event
    // also set a window property to indicate that the sdk is ready, in case their code loaded after the event fired
    window.addEventListener("message", (event) => {
        if (event.data.type !== "HVRSDK_READY") {
            return;
        }

        window.dispatchEvent(new CustomEvent("hyperlinkvr_ready"));
        Object.defineProperty(window, "hyperlinkvr_ready", {
            value: true,
            writable: false,
            configurable: false,
        });
    });
}

// TODO: way to ask the extension if the host is already ready (might need state, if not just send a message and see if it gets a reply ig)
// TODO: replace dom event with a wait_for_ready that immeidately returns if already ready

