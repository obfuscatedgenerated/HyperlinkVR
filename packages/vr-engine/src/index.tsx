import { Canvas, RootState } from "@react-three/fiber";
import { createXRStore, PointerEvents, XR } from "@react-three/xr";
import { TabSessionProvider } from "@viewportvr/react";
import { memo, useCallback, useRef } from "react";
import { WebGLRenderer } from "three";



import { CanvasResizer } from "./CanvasResizer";
import { DOMMirror } from "./DOMMirror";
import { FakeHand } from "./FakeHand";
import { LogoOverlay } from "./LogoOverlay";
import { frame_transforms, SpectatorCameraController } from "./SpectatorCameraController";
import { MixedRealityCameraController } from "./MixedRealityCameraController";
import { URLBar } from "./URLBar";
import { WristWatch } from "./WristWatch";
import { DefaultGLProps } from "@react-three/fiber/dist/declarations/src/core/renderer";


export const xr_store = createXRStore({
    controller: FakeHand,
    offerSession: false,
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
const make_xr_compatible_renderer = ({canvas}: DefaultGLProps) => {
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

export const VRHost = memo(({on_xr_ready}: {on_xr_ready: () => void}) => {
    const canvas_container_ref = useRef<HTMLDivElement>(null);

    const handle_created = useCallback(
        ({ gl }: RootState) => {
            gl.domElement.addEventListener(
                "webglcontextlost",
                (event) => {
                    // @ts-ignore non-standard, present in Chrome
                    console.error("Context Lost:", event["statusMessage"]);
                },
                false
            );

            on_xr_ready();
        },
        [on_xr_ready]
    );

    return (
        <TabSessionProvider>
            <div
                className="w-full h-full max-w-[calc(100vh*16/9)] max-h-[calc(100vw*9/16)] relative"
                ref={canvas_container_ref}
            >
                <LogoOverlay />

                <Canvas gl={make_xr_compatible_renderer} onCreated={handle_created}>
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
                        {/*<MixedRealityCameraController />*/}
                    </XR>
                </Canvas>
            </div>
        </TabSessionProvider>
    );
});
