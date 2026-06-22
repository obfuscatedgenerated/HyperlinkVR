


import "~shared.css";



import bg from "data-base64:~../assets/popup_bg.webp";
import { useCallback, useEffect, useState } from "react";



import { useStorage } from "@plasmohq/storage/hook";



import { ToggleSwitch } from "~components/dom/ToggleSwitch";
import { Dropdown } from "~components/dom/Dropdown";





function Popup() {
    const [active, setActive] = useState(false);

    // fade in as soon as the component mounts (slight delay)
    useEffect(() => {
        setTimeout(() => setActive(true), 100);
    }, []);

    const [use_debug_input, setUseDebugInput] = useStorage(
        "settings.use_debug_input",
        false
    );

    const [watch_hand, setWatchHand] = useStorage("settings.watch_hand", "left");

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

    return (
        <div className="bg-gray-900 text-white w-70 h-100">
            <img
                src={bg}
                className={`w-full h-full object-cover absolute top-0 left-0 transition-opacity duration-500 ease-in-out ${active ? "opacity-100" : "opacity-0"}`}
            />

            <div className="p-4 w-full h-full flex flex-col items-center justify-center absolute top-0 left-0 gap-4">
                <h1 className="font-title text-2xl mb-8 absolute top-4">ViewportVR</h1>

                <button
                    className="mb-4 px-4 py-2 outline outline-white rounded-lg hover:not-disabled:bg-white hover:not-disabled:text-black transition text-xl font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-600"
                    onClick={() => {
                        chrome.runtime.sendMessage({ action: "VVR_LAUNCH" });
                        window.close();
                    }}>
                    Launch
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
                        { label: "Right Hand", value: "right" },
                    ]}
                    selected={watch_hand}
                    on_change={setWatchHand}
                    label="Watch hand"
                    tooltip="Which hand to wear the wristwatch on."
                />
            </div>
        </div>
    );
}

// TODO: check if launch allowed in context (not protected page), dont mark active or interactable if not

export default Popup;
