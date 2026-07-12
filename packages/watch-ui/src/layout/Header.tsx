import {ArrowLeft} from "@react-three/uikit-lucide";
import {Container, Text} from "@react-three/uikit";
import {Button} from "@react-three/uikit-default";
import {useNavState} from "../contexts/NavStateContext";

interface HeaderProps {
    end_buttons?: React.ReactNode;
}

export const Header = ({end_buttons = null}: HeaderProps) => {
    const {current, backwards, back, name_to_title} = useNavState();

    return (
        <Container width="100%" flexDirection="row" alignItems="center" justifyContent="space-between" gap={16} marginBottom={24}>
            <Container flexDirection="row" alignItems="center" gap={16}>
                {backwards.length !== 0 && (
                    <Button onPointerDown={back}>
                        <ArrowLeft />
                    </Button>
                )}

                <Text color="white" fontSize={32} fontWeight="bold">
                    {name_to_title(current)}
                </Text>
            </Container>

            {end_buttons}
        </Container>
    );
}
