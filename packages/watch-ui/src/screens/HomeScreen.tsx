import { Container, Text } from "@react-three/uikit";
import { Button, Label, Switch } from "@react-three/uikit-default";
import { useTabSession } from "@hyperlinkvr/react";
import { useState } from "react";

import type { ScreenProps } from "./index";

export const HomeScreen = ({change_screen}: ScreenProps) => {
    const [switch_enabled, setSwitchEnabled] = useState(false);
    const session = useTabSession();

    return (
        <>
            <Container
                onPointerDown={() => {
                    console.log("hello");
                    setSwitchEnabled(!switch_enabled);
                }}
                flexDirection="row"
                alignItems="center"
                gap={8}>
                <Label>
                    <Text>Awesomeness detection</Text>
                </Label>

                <Switch checked={switch_enabled} />
            </Container>

            <Text>{session.url}</Text>

            <Button onPointerDown={() => change_screen("settings")}>
                <Text>Go to Settings</Text>
            </Button>
        </>
    );
};