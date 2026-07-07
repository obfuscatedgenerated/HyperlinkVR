import { Container, Svg, Text } from "@react-three/uikit";
import { Button } from "@react-three/uikit-default";
import { useStorage, useTabSession } from "@hyperlinkvr/react";

import type { ScreenProps } from "./index";
import { Settings, Star } from "@react-three/uikit-lucide";
import { useMemo } from "react";

const star_filled_url = new URL("../assets/lucide_star_filled.svg", import.meta.url).href;
const StarFilled = () => (
    <Svg src={star_filled_url} width={24} height={24}  />
);

export const HomeScreen = ({change_screen}: ScreenProps) => {
    const session = useTabSession();

    const [favourite_worlds, setFavouriteWorlds] = useStorage("sync", "favourite_worlds", [] as string[]);
    const is_world_favourite = useMemo(() => {
        if (!session.url) return false;
        return favourite_worlds.includes(session.url);
    }, [favourite_worlds, session.url]);


    const [recent_worlds] = useStorage("local", "recent_worlds", [] as string[]);

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

                <Button variant="link" color="black" marginLeft="auto" onPointerDown={() => {
                    if (!session.url) return;
                    if (is_world_favourite) {
                        setFavouriteWorlds(favourite_worlds.filter(url => url !== session.url));
                    } else {
                        setFavouriteWorlds([...favourite_worlds, session.url]);
                    }
                }}>
                    {is_world_favourite ? <StarFilled /> : <Star />}
                </Button>
            </Container>
        </Container>
    );
};

// TODO: carousels of favourite worlds and recent worlds, with buttons to launch them, as well as some cached image somewhere

// TODO: base screen component that defines padding and titlebar with backstack and custom buttons
