import { TabSessionProvider, useSetting } from "@hyperlinkvr/react";
import { Text } from "@react-three/drei";
import { Canvas, RootState, RootStore } from "@react-three/fiber";
import type { DefaultGLProps } from "@react-three/fiber/dist/declarations/src/core/renderer";
import { Physics } from "@react-three/rapier";
import { createXRStore, XR } from "@react-three/xr";
import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { ErrorBoundary, getErrorMessage, type FallbackProps } from "react-error-boundary";
import { Group, NeutralToneMapping, WebGLRenderer } from "three";
import { configureTextBuilder } from "troika-three-text";



import { DOMMirror } from "../browser/DOMMirror";
import { URLBar } from "../browser/URLBar";
import { AvatarProvider, PlayerOriginProvider } from "../contexts";
import { SessionModeProvider } from "../contexts/SessionModeContext";
import { WebSDKMessagingProvider } from "../contexts/WebSDKMessagingContext";
import { SceneDebug } from "../debug/SceneDebug";
import { HandsProvider } from "../input/hands";
import { FlatInputProvider } from "../input/impl/flat/bindings";
import { Crosshair } from "../input/impl/flat/Crosshair";
import { FlatClickRaycaster } from "../input/impl/flat/FlatClickRaycaster";
import { SpectatorCamera } from "../misc";
import { AvatarMirror } from "../misc/AvatarMirror";
import { LogoOverlay } from "../misc/LogoOverlay";
import { FlatAvatarHands, XRAvatarHand } from "../player/AvatarHand";
import { Player } from "../player/Player";
import { CameraSetup } from "../render/CameraSetup";
import { CanvasResizer } from "../render/CanvasResizer";
import { FloorCollider } from "../world/FloorCollider";
import { Sky } from "../world/Sky";
import { EngineObjectSpawner } from "./EngineObjectSpawner";
import { EngineObjectSync } from "./EngineObjectSync";


configureTextBuilder({
    useWorker: false
});

export const xr_store = createXRStore({
    controller: XRAvatarHand,
    handTracking: false,
    offerSession: false
});

// three.js's WebXRManager only calls `gl.makeXRCompatible()` lazily, on
// enterVR(), if the context wasn't already created with `xrCompatible:
// true`. On machines where the headset is driven by a different GPU/adapter
// than the page's WebGL context, that *late* call can force Chrome to
// genuinely destroy and recreate the context to move rendering onto the
// right adapter — that's the "context lost" you're hitting, since by then
// the canvas has already been actively rendering the spectator view on the
// wrong adapter. Pre-creating the context as xrCompatible makes that check
// a no-op, so the swap (if any) happens once, at mount, before you've
// rendered anything that matters.
// https://github.com/mrdoob/three.js/issues/30674
const make_xr_compatible_renderer = ({ canvas }: DefaultGLProps) => {
    if (!("getContext" in canvas)) {
        throw new Error("Canvas does not support getContext");
    }

    const context = canvas.getContext("webgl2", {
        alpha: false,
        antialias: false,
        xrCompatible: true
    }) as WebGL2RenderingContext | null;

    return new WebGLRenderer({
        canvas,
        ...(context ? { context } : { alpha: false, antialias: false }) // fallback if webgl2 ctx creation somehow fails
    });
};

const VRErrorFallback = ({ error, resetErrorBoundary }: FallbackProps) => (
    <group position={[0, 1.5, -2]}>
        {/* Background Panel */}
        <mesh>
            <planeGeometry args={[2.5, 1.2]} />
            <meshBasicMaterial color="#4a0000" /> {/* Dark red alert color */}
        </mesh>

        {/* Title Text */}
        <Text
            position={[0, 0.3, 0.01]}
            fontSize={0.15}
            color="white"
            anchorY="middle">
            Game Error
        </Text>

        {/* Actual Error Message */}
        <Text
            position={[0, 0, 0.01]}
            fontSize={0.07}
            color="#ffcccc"
            maxWidth={2.2}
            textAlign="center">
            {getErrorMessage(error) || "An unexpected error occurred."}
        </Text>

        {/* Interactive Restart Button */}
        <mesh
            position={[0, -0.35, 0.01]}
            onClick={resetErrorBoundary} // Your XR PointerEvents will trigger this!
            onPointerOver={(e) => e.object.material.color.set("white")} // Hover effect
            onPointerOut={(e) => e.object.material.color.set("#cccccc")}>
            <planeGeometry args={[0.8, 0.25]} />
            <meshBasicMaterial color="#cccccc" />

            <Text position={[0, 0, 0.01]} fontSize={0.08} color="black">
                Restart Session
            </Text>
        </mesh>
    </group>
);

const FatalErrorFallback = ({ error, resetErrorBoundary }: FallbackProps) => (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-50 text-white gap-8">
        <h1 className="text-3xl font-bold">Fatal Error</h1>
        <p className="text-lg text-red-400">
            {getErrorMessage(error) || "An unexpected error occurred."}
        </p>
        <button
            onClick={resetErrorBoundary}
            className="px-6 py-3 bg-red-600 rounded hover:bg-red-700 transition cursor-pointer">
            Restart Session
        </button>
    </div>
);

const FlatErrorFallback = VRErrorFallback; // TODO: make it follow player more properly

const SceneContents = ({
    extra_in_origin
}: {
    extra_in_origin?: React.ReactNode;
}) => {
    const [show_colliders] = useSetting("debug_colliders");
    const player_ref = useRef<Group>(null);

    return (
        <Physics interpolate gravity={[0, -9.81, 0]} debug={show_colliders}>
            <FloorCollider />
            <Sky
                sky_zenith_color={0x111111}
                sky_horizon_color={0x222222}
                ground_horizon_color={0x111111}
                ground_nadir_color={0x000000}
                sun_color={0xffffff}
            />

            <PlayerOriginProvider value={player_ref}>
                <Player ref={player_ref} />

                <URLBar
                    position={[0, 3.25, -4]}
                    height={0.25}
                    height_of_dom_mirror={3}
                />
                <DOMMirror position={[0, 1.5, -4]} height={3} />

                <AvatarMirror
                    position={[2, 0, 0]}
                    rotation={[0, -Math.PI / 2, 0]}
                />

                <EngineObjectSpawner />

                {extra_in_origin || null}
            </PlayerOriginProvider>
        </Physics>
    );
};

const EngineHostInternal = memo(
    ({ on_ready, mode }: { on_ready: () => void; mode: "vr" | "flat" }) => {
        // gracefully end session on unmount to avoid renderer crash
        useEffect(() => {
            return () => {
                const session = xr_store.getState().session;
                if (session) {
                    session.end().catch((err: Error) => {
                        console.error(
                            "Failed to end XR session on unmount:",
                            err
                        );
                    });
                }
            };
        }, []);

        const canvas_container_ref = useRef<HTMLDivElement>(null);

        const handle_created = useCallback(
            ({ gl }: RootState) => {
                gl.toneMapping = NeutralToneMapping;
                gl.toneMappingExposure = 1.0;

                gl.domElement.addEventListener(
                    "webglcontextlost",
                    (event) => {
                        // @ts-ignore non-standard, present in Chrome
                        console.error("Context Lost:", event["statusMessage"]);
                    },
                    false
                );

                on_ready();
            },
            [on_ready]
        );

        return (
            <SessionModeProvider value={mode}>
                <TabSessionProvider>
                    <WebSDKMessagingProvider>
                        <EngineObjectSync />

                        <div
                            className={`w-full h-full relative ${mode === "vr" ? "max-w-[calc(100vh*16/9)] max-h-[calc(100vw*9/16)]" : ""}`}
                            ref={canvas_container_ref}
                        >
                            {mode === "vr" && <LogoOverlay />}
                            {mode === "flat" && <Crosshair />}

                            <AvatarProvider>
                                <HandsProvider>
                                    <Canvas
                                        gl={make_xr_compatible_renderer}
                                        onCreated={handle_created}
                                    >
                                        <CameraSetup />
                                        <CanvasResizer
                                            containerRef={canvas_container_ref}
                                        />

                                        <SceneDebug />

                                        {mode === "vr" ? (
                                            <XR store={xr_store}>
                                                <ErrorBoundary
                                                    FallbackComponent={
                                                        VRErrorFallback
                                                    }
                                                    onReset={() =>
                                                        window.location.reload()
                                                    }>
                                                    <SceneContents
                                                        extra_in_origin={
                                                            <SpectatorCamera />
                                                        }
                                                    />
                                                </ErrorBoundary>
                                            </XR>
                                        ) : (
                                            <ErrorBoundary
                                                FallbackComponent={
                                                    FlatErrorFallback
                                                }
                                                onReset={() =>
                                                    window.location.reload()
                                                }
                                            >
                                                <FlatInputProvider>
                                                    <FlatClickRaycaster />
                                                    <FlatAvatarHands />
                                                    <SceneContents />
                                                </FlatInputProvider>
                                            </ErrorBoundary>
                                        )}
                                    </Canvas>
                                </HandsProvider>
                            </AvatarProvider>
                        </div>
                    </WebSDKMessagingProvider>
                </TabSessionProvider>
            </SessionModeProvider>
        );
    }
);

export const EngineHost = ({ on_xr_ready, mode }: { on_xr_ready: () => void, mode: "vr" | "flat" }) => (
    <ErrorBoundary
        FallbackComponent={FatalErrorFallback}
        onReset={() => window.location.reload()}
    >
        <EngineHostInternal on_ready={on_xr_ready} mode={mode} />
    </ErrorBoundary>
);

// TODO: see if soft reset possible
