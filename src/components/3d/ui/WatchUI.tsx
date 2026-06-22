import { Container, Text } from "@react-three/uikit";
import * as THREE from "three";
import { configureTextBuilder } from "troika-three-text";

// its not happy! turn off web workers
configureTextBuilder({
    useWorker: false
});

export const WATCH_UI_WIDTH = 900;
export const WATCH_UI_HEIGHT = 600;

class DoubleSidedSolidPanel extends THREE.MeshBasicMaterial {
    constructor() {
        super({
            side: THREE.DoubleSide,
            transparent: true,
            depthWrite: false
        });
    }
}

export const WatchUI = () => {
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
            <Text
                fontSize={24}
                color="#ffffff"
                anchorX="center"
                anchorY="middle">
                UI goes here!
            </Text>
        </Container>
    );
};
