import { Container, Text } from "@react-three/uikit";
import { Button } from "@react-three/uikit-default";
import { useTabSession } from "@hyperlinkvr/react";

import type { ScreenProps } from "./index";
import { Settings} from "@react-three/uikit-lucide";

export const HomeScreen = ({change_screen}: ScreenProps) => {
    const session = useTabSession();

    return (
        <Container
            width="100%"
            height="100%"
            padding={24}
            flexDirection="column"
        >
            <Container flexDirection="row" alignItems="center" justifyContent="space-between" gap={16} marginBottom={24}>
                <Text color="white" fontSize={32} fontWeight="bold">
                    Home
                </Text>

                <Button onPointerDown={() => change_screen("settings")}>
                    <Settings />
                </Button>
            </Container>

            <Container flexDirection="row" alignItems="center" gap={8} marginBottom={16} backgroundColor="#ffffff" padding={12} borderRadius={6}>
                <Text fontWeight="bold">Current world:</Text>
                <Text>{session.url}</Text>
            </Container>
        </Container>
    );
};

// TODO: base screen component that defines padding and titlebar with backstack and custom buttons
