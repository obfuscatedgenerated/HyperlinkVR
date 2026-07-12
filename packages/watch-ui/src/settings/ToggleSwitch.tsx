import { Label, Switch } from "@react-three/uikit-default";
import { Container, Text } from "@react-three/uikit";
import {useCrossfadeOpacity} from "../animation/Crossfader";

export const ToggleSwitch = ({value, on_change, label}: {value: boolean; on_change: (value: boolean) => void; label: string}) => {
    const opacity = useCrossfadeOpacity();

    return (
        <Container
            onPointerDown={() => on_change(!value)}
            flexDirection="row"
            alignItems="center"
            gap={8}
            opacity={opacity}
        >
            <Label>
                <Text>{label}</Text>
            </Label>

            <Switch checked={value} />
        </Container>
    );
}
