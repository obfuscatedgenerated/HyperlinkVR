import { useMessageEngine, useStorage } from "@viewportvr/react";
import { ToggleSwitch } from "@viewportvr/ui-dom";
import bg from "data-base64:~../assets/popup_bg.webp";
import { WATCH_UI_HEIGHT, WATCH_UI_WIDTH } from "@viewportvr/watch-ui";
import { Message } from "@viewportvr/core";

const ToolGroup = ({
    title,
    children
}: {
    title: string;
    children: React.ReactNode;
}) => {
    return (
        <div className="flex flex-col gap-3">
            <h2 className="text-white text-xl font-title font-light">
                {title}
            </h2>
            <div className="flex flex-col gap-2 p-4 bg-black/20 rounded-md backdrop-blur-md border border-white/20">
                {children}
            </div>
        </div>
    );
};

const ToolButton = ({
    label,
    on_click
}: {
    label: string;
    on_click: () => void;
}) => {
    return (
        <button
            className="text-gray-300 px-4 py-2 bg-blue-600 rounded-lg hover:not-disabled:bg-blue-700 transition text-lg font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-600"
            onClick={on_click}>
            {label}
        </button>
    );
};

const ToolMessengerButton = ({
    label,
    message
}: {
    label: string;
    message: Message;
}) => {
    const messenger = useMessageEngine();

    const handle_click = () => {
        messenger.send(message);
    };

    return <ToolButton label={label} on_click={handle_click} />;
};

const ToolWindowButton = ({
    label,
    intent,
    args,
    width,
    height
}: {
    label: string;
    intent: string;
    args?: Record<string, any>;
    width: number;
    height: number;
}) => {
    const messenger = useMessageEngine();

    const handle_click = () => {
        messenger.send({ action: "VVR_CREATE_WINDOW", intent, args, type: "popup", width, height });
    };

    return <ToolButton label={label} on_click={handle_click} />;
};

const ToolSettingSwitch = ({
    label,
    setting_key,
    default_val
}: {
    label: string;
    setting_key: string;
    default_val?: boolean;
}) => {
    const [enabled, setEnabled] = useStorage("sync", setting_key, default_val);

    return (
        <ToggleSwitch enabled={enabled || false} on_change={setEnabled} label={label} />
    );
};

const DevTools = () => {
    return (
        <main
            className="text-white w-full h-screen bg-cover bg-center font-sans"
            style={{ backgroundImage: `url(${bg})` }}>
            <div className="w-full h-full p-6 bg-black/50 backdrop-blur-md">
                <h1 className="text-4xl font-bold font-title">
                    ViewportVR DevTools
                </h1>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                    <ToolGroup title="Authentication Hosts">
                        <ToolWindowButton
                            label="Open auth manifest generator"
                            intent="DEVTOOLS_FORM"
                            args={{
                                schema: "AuthManifest",
                                format: "json",
                                filename: "auth-manifest"
                            }}
                            width={400}
                            height={800}
                        />
                    </ToolGroup>

                    <ToolGroup title="UI Inspector">
                        <ToolWindowButton
                            label="Open watch UI"
                            intent="DEVTOOLS_WATCH_UI"
                            width={WATCH_UI_WIDTH}
                            height={WATCH_UI_HEIGHT}
                        />
                    </ToolGroup>

                    <ToolGroup title="Input Interception">
                        <ToolSettingSwitch
                            label="Debug click points"
                            setting_key="settings.debug_clicks"
                            default_val={false}
                        />
                    </ToolGroup>

                    <ToolGroup title="Raycasts (VR)">
                        <ToolSettingSwitch
                            label="Show touch rays"
                            setting_key="settings.debug_touch"
                            default_val={false}
                        />
                        <ToolSettingSwitch
                            label="Show controller ray hits"
                            setting_key="settings.debug_ray_hits"
                            default_val={false}
                        />
                    </ToolGroup>
                </div>
            </div>
        </main>
    );
};

// TODO: namespace settings

export default DevTools;
