import { Container } from "@react-three/uikit";
import { useMemo, useState } from "react";
import { DoubleSide, MeshBasicMaterial } from "three";
import { configureTextBuilder } from "troika-three-text";



import { ScreenName, screens } from "./screens";


// its not happy! turn off web workers
configureTextBuilder({
    useWorker: false
});

export const WATCH_UI_WIDTH = 900;
export const WATCH_UI_HEIGHT = 600;

class DoubleSidedSolidPanel extends MeshBasicMaterial {
    constructor() {
        super({
            side: DoubleSide,
            transparent: true,
            depthWrite: false
        });
    }
}

export const WatchUI = () => {
    const [screen, setScreen] = useState<ScreenName>("home");
    const ScreenComponent = useMemo(() => screens[screen], [screen]);

    return (
        <Container
            width={WATCH_UI_WIDTH}
            height={WATCH_UI_HEIGHT}
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            backgroundColor="#4db8ff"
            opacity={0.8}
            borderRadius={16}
            panelMaterialClass={DoubleSidedSolidPanel}
        >
            <ScreenComponent change_screen={setScreen} />
        </Container>
    );
};

// TODO: improve touch
