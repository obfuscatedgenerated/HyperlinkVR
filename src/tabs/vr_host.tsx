import { Canvas } from "@react-three/fiber";
import { createXRStore, PointerEvents, XR } from "@react-three/xr";
import React, { useCallback, useEffect, useRef, useState } from "react";

import "~shared.css";

import { CanvasResizer } from "~components/3d/CanvasResizer";
import { DOMMirror } from "~components/3d/DOMMirror";
import { FakeHand } from "~components/3d/FakeHand";
import { SpectatorCameraController } from "~components/3d/SpectatorCameraController";
import { URLBar } from "~components/3d/URLBar";
import { WristWatch } from "~components/3d/WristWatch";
import { LogoOverlay } from "~components/dom/LogoOverlay";
import { useTabSession } from "~hooks/useTabSession";

const xr_store = createXRStore({
    controller: FakeHand
});

const SpectatorWindow = () => {
    const [started, setStarted] = useState(false);
    const [is_supported, setIsSupported] = useState<boolean | null>(false);

    useTabSession();

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

    const canvas_container_ref = useRef<HTMLDivElement>(null);

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
        <main className="font-sans">
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
            <div className="h-screen w-screen bg-black flex items-center justify-center">
                <div
                    className="w-full h-full max-w-[calc(100vh*16/9)] max-h-[calc(100vw*9/16)] relative"
                    ref={canvas_container_ref}>
                    <LogoOverlay />

                    <Canvas gl={{ alpha: false }}>
                        <CanvasResizer containerRef={canvas_container_ref} />

                        <XR store={xr_store}>
                            <PointerEvents />

                            <color attach="background" args={["#111111"]} />
                            <ambientLight intensity={0.5} />
                            <pointLight position={[10, 10, 10]} />

                            <URLBar
                                position={[0, 3.25, -4]}
                                height={0.25}
                                height_of_dom_mirror={3}
                            />
                            <DOMMirror position={[0, 1.5, -4]} height={3} />

                            <WristWatch />

                            <SpectatorCameraController />
                        </XR>
                    </Canvas>
                </div>
            </div>
        </main>
    );
};

export default SpectatorWindow;
