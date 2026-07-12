import {ArrowLeft} from "@react-three/uikit-lucide";
import {Container, Text} from "@react-three/uikit";
import {Button} from "@react-three/uikit-default";
import {Crossfader, useCrossfadeOpacity} from "../animation/Crossfader";
import {useNavState} from "../contexts/NavStateContext";

interface HeaderProps {
    nav_state: ReturnType<typeof useNavState>;
    end_buttons?: React.ReactNode;
}

const BackButton = ({back, show}: {back: () => void, show: boolean}) => {
    const opacity = useCrossfadeOpacity();

    return (
        show && (
            <Button onPointerDown={back} opacity={opacity}>
                <ArrowLeft />
            </Button>
        )
    );
}

export const Header = ({nav_state, end_buttons = null}: HeaderProps) => {
    if (!nav_state) {
        return null;
    }

    const {current, backwards, back, name_to_title} = nav_state;

    return (
        <Container height="10%" width="100%" flexDirection="row" alignItems="center" justifyContent="space-between" gap={16}>
            <Crossfader content_key={backwards.length} width="10%" height="100%" alignItems="center" justifyContent="flex-start">
                <BackButton back={back} show={backwards.length !== 0} />
            </Crossfader>

            <Crossfader content_key={current || "none"}>
                <Text color="white" fontSize={32} fontWeight="bold">
                    {name_to_title(current)}
                </Text>
            </Crossfader>

            <Crossfader content_key={current || "none"} width="10%" height="100%" flexShrink={0} alignItems="center" justifyContent="flex-end">
                {end_buttons}
            </Crossfader>
        </Container>
    );
}
