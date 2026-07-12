import { Container } from "@react-three/uikit";
import { useMemo, useState } from "react";
import { DoubleSide, MeshBasicMaterial } from "three";
import { configureTextBuilder } from "troika-three-text";



import { ScreenName, screens } from "./screens";
import {NavStateProvider, useNavState} from "./contexts/NavStateContext";


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

const CurrentScreen = () => {
    const {current} = useNavState();
    const ScreenComponent = useMemo(() => {
        if (!current) return () => null;
        const screen = screens[current];
        if (!screen) return () => null;
        return screen;
    }, [current]);

    // TODO: transition
    return (
        <ScreenComponent />
    );
}

export const WatchUI = () => {
    return (
        <Container
            width={WATCH_UI_WIDTH}
            height={WATCH_UI_HEIGHT}
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            backgroundColor="#547299"
            opacity={0.85}
            borderRadius={16}
            panelMaterialClass={DoubleSidedSolidPanel}

            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onPointerMove={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
        >
            <NavStateProvider>
                <CurrentScreen />
            </NavStateProvider>
        </Container>
    );
};

// TODO: disable movement when watch open
// TODO: add ui debounce to prevent double pointer on pushing too far through watch? or just global Z check?
