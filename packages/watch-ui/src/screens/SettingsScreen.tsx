import { Container, Text } from "@react-three/uikit";
import { useSettingsTree } from "@hyperlinkvr/react";
import { useMemo, useState } from "react";
import type { SettingsTree, SettingKey } from "@hyperlinkvr/types";
import { WatchSettingWidget } from "../settings/WatchSettingWidget";
import { ScreenProps } from "./index";
import { Button } from "@react-three/uikit-default";
import { ArrowLeft } from "@react-three/uikit-lucide";

const SettingSubtree = ({
    index,
    tree,
    is_root = false
}: {
    index: string;
    tree: SettingsTree;
    is_root?: boolean;
}) => {
    const subtree = useMemo(() => tree.subtrees[index], [index, tree]);

    if (!subtree) return null;

    return (
        <Container
            flexDirection="row"
            flexWrap="wrap"
            gap={16}
            alignItems="stretch" // Ensures all panels in a row are the same height
            width="100%"
            // If it's a nested subtree, style the grid container itself as a panel
            {...(!is_root ? {
                borderWidth: 1,
                borderColor: "rgba(255, 255, 255, 0.2)",
                padding: 16,
                borderRadius: 6,
                backgroundColor: "rgba(0, 0, 0, 0.2)"
            } : {})}
        >
            {/* TILE 1: Top-level settings (if any) */}
            {subtree.settings && subtree.settings.length > 0 && (
                <Container
                    flexDirection="column"
                    gap={16}
                    // Force it to act like a grid column
                    width="48%"
                    minWidth={250} // Prevent it from getting too squished
                >
                    {subtree.settings.map(setting => (
                        <WatchSettingWidget key={setting.key} setting_key={setting.key as SettingKey} />
                    ))}
                </Container>
            )}

            {/* TILES 2+: Each nested subtree gets its own panel */}
            {subtree.subtrees && Object.keys(subtree.subtrees).length > 0 && (
                Object.keys(subtree.subtrees).map(subtab => (
                    <Container
                        key={subtab}
                        flexDirection="column"
                        gap={8}
                        // Match the settings tile width
                        width="48%"
                        minWidth={250}
                    >
                        <Text fontSize={18} fontWeight="bold" color="white" marginBottom={8}>
                            {subtab}
                        </Text>
                        {/* Render the next level of the grid inside this panel */}
                        <SettingSubtree index={subtab} tree={subtree} />
                    </Container>
                ))
            )}
        </Container>
    );
};

const TabButton = ({ label, active, on_click }: { label: string; active: boolean; on_click: () => void }) => {
    return (
        <Container
            cursor="pointer"
            paddingX={16}
            paddingY={8}
            borderTopRadius={6}
            backgroundColor={active ? "#2563eb" : "#374151"}
            hover={{ backgroundColor: active ? "#2563eb" : "#4b5563" }}
            onPointerDown={on_click}
        >
            <Text fontSize={20} color={active ? "white" : "#d1d5db"}>
                {label}
            </Text>
        </Container>
    );
};

export const SettingsScreen = ({change_screen}: ScreenProps) => {
    const tree = useSettingsTree("watch");

    const [tab, setTab] = useState("General");

    return (
        <Container
            width="100%"
            height="100%"
            padding={24}
            flexDirection="column"
        >
            <Container flexDirection="row" alignItems="center" gap={16} marginBottom={24}>
                <Button onPointerDown={() => change_screen("home")}>
                    <ArrowLeft />
                </Button>

                <Text color="white" fontSize={32} fontWeight="bold">
                    Settings
                </Text>
            </Container>

            <Container flexDirection="row" gap={8}>
                {Object.keys(tree.subtrees).map(subtab => (
                    <TabButton
                        key={subtab}
                        label={subtab}
                        active={tab === subtab}
                        on_click={() => setTab(subtab)}
                    />
                ))}
            </Container>

            <Container
                backgroundColor="rgba(0, 0, 0, 0.2)"
                padding={16}
                borderBottomRadius={6}
                borderWidth={1}
                borderColor="rgba(255, 255, 255, 0.2)"
            >
                {tree.subtrees[tab] && (
                    <SettingSubtree index={tab} tree={tree} is_root />
                )}
            </Container>
        </Container>
    );
};