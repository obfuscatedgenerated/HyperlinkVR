import { Container } from "@react-three/uikit";
import { useMemo, useState } from "react";
import { DoubleSide, MeshBasicMaterial } from "three";
import { configureTextBuilder } from "troika-three-text";



import { ScreenName, screens } from "./screens";
import {NavStateProvider, useNavState} from "./contexts/NavStateContext";
import {Crossfader, useCrossfadeOpacity} from "./animation/Crossfader";
import {Button} from "@react-three/uikit-default";
import {Settings} from "@react-three/uikit-lucide";
import {Header} from "./layout/Header";


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

const EndButtons = ({ current, change_screen }: { current: ScreenName | null, change_screen: (screen_name: ScreenName) => void }) => {
    const opacity = useCrossfadeOpacity();

    return (
        current === "home" && (
            <Button onPointerDown={() => change_screen("settings")} opacity={opacity}>
                <Settings />
            </Button>
        )
    );
}

const CurrentScreen = () => {
    const state = useNavState();
    const { current, change_screen } = state;

    const ScreenContent = useMemo(() => {
        if (!current) return () => null;
        const screen = screens[current];
        if (!screen) return () => null;
        return screen;
    }, [current]);

    return (
        <Container width="100%" maxWidth="100%" height="100%" flexDirection="column" padding={16} gap={12}>
            <Header nav_state={state} end_buttons={<EndButtons current={current} change_screen={change_screen} />} />

            <Crossfader content_key={current || "none"}>
                <Container width="100%" maxWidth="100%" flexDirection="column" gap={16} overflow="hidden">
                    <ScreenContent />
                </Container>
            </Crossfader>
        </Container>
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
