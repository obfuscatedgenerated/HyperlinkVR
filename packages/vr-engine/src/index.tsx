import { Canvas } from "@react-three/fiber";
import { createXRStore, PointerEvents, XR } from "@react-three/xr";
import { TabSessionProvider } from "@viewportvr/react";
import { useRef } from "react";

import { CanvasResizer } from "./CanvasResizer";
import { DOMMirror } from "./DOMMirror";
import { FakeHand } from "./FakeHand";
import { LogoOverlay } from "./LogoOverlay";
import { SpectatorCameraController } from "./SpectatorCameraController";
import { URLBar } from "./URLBar";
import { WristWatch } from "./WristWatch";

export const xr_store = createXRStore({
    controller: FakeHand
});

export const VRHost = () => {
    const canvas_container_ref = useRef<HTMLDivElement>(null);

    return (
        <TabSessionProvider>
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
        </TabSessionProvider>
    );
};
