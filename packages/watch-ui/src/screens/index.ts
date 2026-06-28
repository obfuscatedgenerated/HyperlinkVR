import { SettingsScreen } from "./SettingsScreen";
import { HomeScreen } from "./HomeScreen";

export const screen_names = ["home", "settings"] as const;
export type ScreenName = (typeof screen_names)[number];

export interface ScreenProps {
    change_screen: (screen_name: ScreenName) => void;
}

export const screens: Record<ScreenName, React.ComponentType<ScreenProps>> = {
    home: HomeScreen,
    settings: SettingsScreen
} as const;

// TODO: global headerbar that shows back arrow and title? could just be component if not
// TODO: in regards to that, prob useful to remember a back state in the controller and send that to allow change_screen to go back