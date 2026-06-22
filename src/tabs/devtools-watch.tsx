import "~shared.css";

import { Canvas } from "@react-three/fiber";
import { Container, Fullscreen } from "@react-three/uikit";

import {
    WATCH_UI_HEIGHT,
    WATCH_UI_WIDTH,
    WatchUI
} from "~components/3d/ui/WatchUI";

const DevToolsWatchUI = () => {
    return (
        <main className="w-screen h-screen flex items-center justify-center">
            <Canvas gl={{ localClippingEnabled: true }}>
                <Fullscreen
                    flexDirection="column"
                    alignItems="center"
                    justifyContent="center">
                    <Container
                        width={WATCH_UI_WIDTH}
                        height={WATCH_UI_HEIGHT}
                        flexDirection="column"
                    >
                        <WatchUI />
                    </Container>
                </Fullscreen>
            </Canvas>
        </main>
    );
};

export default DevToolsWatchUI;
