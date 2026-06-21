import shared_css from "data-text:~shared.css";
import type { PlasmoGetStyle } from "plasmo";
import { useEffect, useRef, useState } from "react";


import { Storage } from "@plasmohq/storage";

const storage = new Storage();

export const config = { matches: ["<all_urls>"], all_frames: true };

export const getStyle: PlasmoGetStyle = () => {
    const style = document.createElement("style");
    style.textContent =
        shared_css +
        `
    :host {
        pointer-events: none;
    }
  `;
    return style;
};

const VREnvironment = () => {
    // const [isSticky, setIsSticky] = useState(false);
    //
    // const enterVR = async () => {
    //     try {
    //         xrStore.enterVR();
    //
    //         await storage.set("isInVRSession", true);
    //
    //         setIsSticky(false); // Hide the resume button once active
    //         console.log("XR Session Started");
    //     } catch (e) {
    //         console.error("Failed to enter VR:", e);
    //     }
    // };
    //
    // // Also listen to the store's session state to clean up your extension flags when exiting VR
    // useEffect(() => {
    //     // You can subscribe to changes in the XR store state
    //     const unsub = xrStore.subscribe((state) => {
    //         // If we were visible, but the active session is now null, the user exited VR
    //         if (!state.session) {
    //             storage.set("isInVRSession", false);
    //         }
    //     });
    //     return () => unsub();
    // }, []);
    //
    // useEffect(() => {
    //     // 1. Determine if we should show the "Resume" prompt
    //     const checkStickySession = async () => {
    //         const wasInVR = await storage.get("isInVRSession");
    //         if (wasInVR) {
    //             setIsSticky(true);
    //         }
    //     };
    //     checkStickySession();
    //
    //     // 2. Listen for the Context Menu message
    //     const handleMessage = (message: any) => {
    //         console.log("Received message in content script:", message);
    //         if (message.action === "VVR_ACTIVATE") {
    //             setIsSticky(false);
    //             enterVR();
    //         }
    //     };
    //
    //     chrome.runtime.onMessage.addListener(handleMessage);
    //     return () => chrome.runtime.onMessage.removeListener(handleMessage);
    // }, []);
    //
    // return (
    //     <>
    //         {/* Only show the button if we are in the 'Resume' state */}
    //         {isSticky && (
    //             <button
    //                 onClick={enterVR}
    //                 style={{
    //                     pointerEvents: "auto",
    //                     position: "absolute",
    //                     top: "20px",
    //                     left: "20px",
    //                     padding: "10px",
    //                     zIndex: 100
    //                 }}>
    //                 Resume Spatial Session
    //             </button>
    //         )}
    //     </>
    // );
    // TODO: bring back resumption, notify background (or might be able to move it to the vr host since its now just a light stream of this tab)
};

export default VREnvironment;
