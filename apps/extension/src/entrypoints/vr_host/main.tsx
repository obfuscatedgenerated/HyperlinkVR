import { useCallback, useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom/client";






import "~/shared.css";



import { LoadingSpinner } from "@viewportvr/ui-dom";
import { VRHost, xr_store } from "@viewportvr/vr-engine";



import { DefaultContextProviders } from "~/contexts/DefaultContextProviders";



type LoadPhase = "idle" | "starting" | "started";

const SpectatorUI = () => {
    const starting_ref = useRef(false);
    const [phase, setPhase] = useState<LoadPhase>("idle");

    const [is_supported, setIsSupported] = useState<boolean | null>(false);

    const [xr_ready, setXRReady] = useState(false);
    const handle_xr_ready = useCallback(() => setXRReady(true), []);

    const enter_vr = useCallback(() => {
        if (starting_ref.current || !xr_ready) return;

        starting_ref.current = true; // guard against double-entry
        xr_store
            .enterVR()
            .then(() => setPhase("started"))
            .catch((err) => {
                console.error(err);
                starting_ref.current = false; // allow retry on failure
                setPhase("idle");
            });

        setPhase("starting");
    }, [xr_ready]);

    useEffect(() => {
        const check_support = async () => {
            if (!navigator.xr) {
                setIsSupported(null);
                return;
            }

            const supported =
                await navigator.xr.isSessionSupported("immersive-vr");
            setIsSupported(supported);
        };

        check_support();

        const handle_device_change = async () => {
            const supported =
                await navigator.xr?.isSessionSupported("immersive-vr");
            setIsSupported(supported || false);
        };

        navigator.xr?.addEventListener("devicechange", handle_device_change);

        return () => {
            navigator.xr?.removeEventListener(
                "devicechange",
                handle_device_change
            );
        };
    }, []);

    if (is_supported === null) {
        return (
            <div className="bg-black/80 backdrop-blur-md absolute inset-0 flex flex-col items-center justify-center z-50 text-white gap-8">
                <h1 className="font-title text-3xl">ViewportVR</h1>
                <p className="text-lg">
                    WebXR is not supported in this browser.
                </p>
            </div>
        );
    }

    const button_text = is_supported
        ? phase === "starting"
            ? <LoadingSpinner />
            : "Enter VR"
        : "No VR device detected!";

    return (
        <DefaultContextProviders>
            <main className="font-sans">
                {phase !== "started" && (
                    <div className="bg-black/80 backdrop-blur-md absolute inset-0 flex flex-col items-center justify-center z-50 text-white gap-8">
                        <h1 className="font-title text-3xl">ViewportVR</h1>

                        {xr_ready ? (
                            <button
                                className="px-4 py-2 bg-blue-600 rounded-lg hover:not-disabled:bg-blue-700 transition text-xl font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-600"
                                onClick={enter_vr}
                                disabled={!is_supported || phase === "starting"}
                            >
                                {button_text}
                            </button>
                        ) : <LoadingSpinner />}
                    </div>
                )}
                <div className="h-screen w-screen bg-black flex items-center justify-center">
                    <VRHost on_xr_ready={handle_xr_ready} />
                </div>
            </main>
        </DefaultContextProviders>
    );
};

ReactDOM.createRoot(document.getElementById("root")!).render(<SpectatorUI />);
