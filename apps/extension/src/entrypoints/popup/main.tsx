import "~/shared.css";

import {
    ExtensionMessageEngine,
    ExtensionStorage
} from "@viewportvr/platform-extension";
import { useStorageFromEngine } from "@viewportvr/react";
import { Dropdown, ProfileButton, ToggleSwitch } from "@viewportvr/ui-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";

import { DefaultContextProviders } from "~/contexts/DefaultContextProviders";
import { useActiveTab } from "~/hooks/useActiveTab";
import { check_url_allowed } from "~/util/url_patterns";

import { version } from "../../../package.json";

const bg = new URL("../../../node_modules/@viewportvr/assets/bg.webp", import.meta.url).href;

const Popup = () => {
    const [active, setActive] = useState(false);

    // fade in as soon as the component mounts (slight delay)
    useEffect(() => {
        setTimeout(() => setActive(true), 100);
    }, []);

    const local_storage = useMemo(() => new ExtensionStorage("local"), []);
    const sync_storage = useMemo(() => new ExtensionStorage("sync"), []);
    const session_storage = useMemo(() => new ExtensionStorage("session"), []);
    const storage_engines = useMemo(
        () => ({
            local: local_storage,
            sync: sync_storage,
            session: session_storage
        }),
        [local_storage, sync_storage, session_storage]
    );

    const messenger = useMemo(() => new ExtensionMessageEngine(), []);

    const [use_debug_input, setUseDebugInput] = useStorageFromEngine(
        sync_storage,
        "settings.use_debug_input",
        false
    );

    const [watch_hand, setWatchHand] = useStorageFromEngine(
        sync_storage,
        "settings.watch_hand",
        "left"
    );

    // nevermind, debugger cant be optional
    // const on_debug_input_change = useCallback(
    //     (enabled: boolean) => {
    //         if (enabled) {
    //             // check debug perm
    //             // TODO: un-nest, maybe make an asyncify wrapper for chrome stuff
    //             chrome.permissions.contains(
    //                 { permissions: ["debugger"] },
    //                 (result) => {
    //                     if (result) {
    //                         setUseDebugInput(true);
    //                     } else {
    //                         // request the perm
    //                         chrome.permissions.request(
    //                             { permissions: ["debugger"] },
    //                             (granted) => {
    //                                 if (granted) {
    //                                     setUseDebugInput(true);
    //                                     console.log("Debugger permission granted!");
    //                                 } else {
    //                                     console.warn(
    //                                         "User denied the debugger permission."
    //                                     );
    //                                 }
    //                             }
    //                         );
    //                     }
    //                 }
    //             );
    //         } else {
    //             setUseDebugInput(false);
    //         }
    //     },
    //     [setUseDebugInput]
    // );

    const active_tab = useActiveTab();

    const launch_allowed = useMemo(() => {
        if (!active_tab || !active_tab.url) return false;
        return check_url_allowed(active_tab.url);
    }, [active_tab]);

    const launch = useCallback(() => {
        if (!active_tab) {
            console.warn("No active tab found.");
            return;
        }

        if (!launch_allowed) {
            console.warn("Launch not allowed in this context:", active_tab.url);
            return;
        }

        messenger.send({
            action: "VVR_LAUNCH",
            tab: active_tab.id
        });
        window.close();
    }, [launch_allowed, active_tab]);

    return (
        <DefaultContextProviders
            storage_engines={storage_engines}
            messenger={messenger}>
            <div className="bg-gray-900 text-white w-70 h-100">
                <img
                    src={bg}
                    className={`w-full h-full object-cover absolute top-0 left-0 transition-opacity duration-500 ease-in-out ${active && launch_allowed ? "opacity-100" : "opacity-0"}`}
                />

                <div className="p-4 w-full h-full flex flex-col items-center justify-center absolute top-0 left-0 gap-4">
                    <div className="mb-8 absolute top-4 flex items-center justify-center gap-6">
                        <h1 className="font-title text-2xl">ViewportVR</h1>

                        <ProfileButton />
                    </div>

                    <button
                        className="mb-4 px-4 py-2 outline outline-white rounded-lg hover:not-disabled:bg-white hover:not-disabled:text-black transition text-xl font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-600"
                        onClick={launch}
                        disabled={!launch_allowed}
                        title={
                            launch_allowed
                                ? "Launch ViewportVR in a new window"
                                : "ViewportVR is not allowed on this page. Try navigating to a website."
                        }>
                        {launch_allowed ? "Launch" : "Not allowed"}
                    </button>

                    <ToggleSwitch
                        label="Inject raw input"
                        tooltip={`The default method of dispatching input events to the tab may cause some sites to ignore it.
Enable this option to use Chrome's debugger to inject raw inputs directly.`}
                        enabled={use_debug_input}
                        on_change={setUseDebugInput}
                    />

                    <Dropdown
                        options={[
                            { label: "Left Hand", value: "left" },
                            { label: "Right Hand", value: "right" }
                        ]}
                        selected={watch_hand}
                        on_change={setWatchHand}
                        label="Watch hand"
                        tooltip="Which hand to wear the wristwatch on."
                    />

                    <span className="text-xs text-gray-400 absolute bottom-4">
                        v{version} •{" "}
                        <a
                            target="_blank"
                            rel="noreferrer noopener"
                            href="https://github.com/obfuscatedgenerated/ViewportVR"
                            className="underline hover:text-white transition">
                            GitHub
                        </a>{" "}
                        •{" "}
                        <a
                            target="_blank"
                            rel="noreferrer noopener"
                            href="/devtools.html"
                            className="underline hover:text-white transition">
                            DevTools
                        </a>
                    </span>
                </div>
            </div>
        </DefaultContextProviders>
    );
};

// TODO: check if launch allowed in context (not protected page), dont mark active or interactable if not

ReactDOM.createRoot(document.getElementById("root")!).render(<Popup />);
