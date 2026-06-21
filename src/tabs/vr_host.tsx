import { Canvas } from "@react-three/fiber";
import { createXRStore, XR } from "@react-three/xr";
import React, { useEffect } from "react";

import "~shared.css";
import "./vr_host.css";
import { DOMMirror } from "~components/DOMMirror";
import { SpectatorCamera } from "~components/SpectatorCamera";

const xrStore = createXRStore({});

const SpectatorWindow = () => {
    useEffect(() => {
        // TODO: wait for ready
        xrStore.enterVR().catch(console.error);
    }, []);

    return (
        <div style={{ width: "100vw", height: "100vh", background: "#000" }}>
            <Canvas gl={{ alpha: false }}>
                <XR store={xrStore}>
                    <color attach="background" args={["#111111"]} />
                    <ambientLight intensity={0.5} />
                    <pointLight position={[10, 10, 10]} />

                    <DOMMirror position={[0, 1.5, -2]} />
                    <SpectatorCamera />
                </XR>
            </Canvas>
        </div>
    );
};

export default SpectatorWindow;