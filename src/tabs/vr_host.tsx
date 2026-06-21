import { Canvas } from "@react-three/fiber";
import { createXRStore, XR } from "@react-three/xr";
import React, { useCallback, useEffect, useState } from "react";

import "~shared.css";
import "./vr_host.css";

import { DOMMirror } from "~components/DOMMirror";
import { SpectatorCamera } from "~components/SpectatorCamera";

const xr_store = createXRStore({});

const SpectatorWindow = () => {
    const [started, setStarted] = useState(false);
    const [is_supported, setIsSupported] = useState<boolean | null>(false);

    const enter_vr = useCallback(() => {
        if (started) return;

        xr_store.enterVR().catch(console.error);
        setStarted(true);
    }, [setStarted]);

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
            setIsSupported(supported);
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

    return (
        <>
            {!started && (
                <div className="bg-black/80 backdrop-blur-md absolute inset-0 flex flex-col items-center justify-center z-50 text-white gap-8">
                    <h1 className="font-title text-3xl">ViewportVR</h1>

                    <button
                        className="px-4 py-2 bg-blue-600 rounded-lg hover:not-disabled:bg-blue-700 transition text-xl font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-600"
                        onClick={enter_vr}
                        disabled={!is_supported}>
                        {is_supported ? "Enter VR" : "No VR device detected!"}
                    </button>
                </div>
            )}
            <div
                style={{ width: "100vw", height: "100vh", background: "#000" }}>
                <Canvas gl={{ alpha: false }}>
                    <XR store={xr_store}>
                        <color attach="background" args={["#111111"]} />
                        <ambientLight intensity={0.5} />
                        <pointLight position={[10, 10, 10]} />

                        <DOMMirror position={[0, 1.5, -4]} height={3} />
                        <SpectatorCamera />
                    </XR>
                </Canvas>
            </div>
        </>
    );
};

export default SpectatorWindow;
