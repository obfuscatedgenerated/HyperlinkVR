import { createContext, useContext, useEffect, useState } from "react";
import { useMessageEngine } from "./engines";
import { useWindowArguments } from "./windowing";
import type { EventMessage } from "@hyperlinkvr/types";

export interface TabSessionContextValue {
    id: number;
    url: string | null;
    dimensions: {
        width: number;
        height: number;
    } | null;
}

const TabSessionContext = createContext<TabSessionContextValue | null>(null);

export const TabSessionProvider = ({
    children
}: {
    children: React.ReactNode;
}) => {
    const window_data = useWindowArguments();

    if (!window_data.tab) {
        throw new Error("TabSessionProvider must be used within a window with a tab argument");
    }

    const { tab: tab_str } = window_data;
    const tab = parseInt(tab_str, 10);

    const messenger = useMessageEngine();

    const [url, setUrl] = useState<string | null>(null);
    const [dimensions, setDimensions] = useState<{
        width: number;
        height: number;
    } | null>(null);

    // listen for tab close
    useEffect(() => {
        const channel = messenger.connect<never, EventMessage>(`hvr-tab-session:${tab}`);

        const unlisten = channel.listen(async (msg) => {
            // still watch for tab close via the general broadcast channel
            if (msg.type === "HVR_TAB_CLOSED" && msg.tab === tab) {
                window.close();
                return;
            }

            if (msg.type === "HVR_URL_UPDATE") {
                setUrl(msg.url);
            }

            if (msg.type === "HVR_DIMENSIONS_UPDATE") {
                setDimensions({ width: msg.width, height: msg.height });
            }
        });

        return () => {
            unlisten();
            channel.disconnect();
        };
    }, [messenger, tab]);

    return (
        <TabSessionContext.Provider
            value={{
                id: tab,
                url,
                dimensions
            }}>
            {children}
        </TabSessionContext.Provider>
    );
};

export const useTabSession = () => {
    const context = useContext(TabSessionContext);
    if (!context) {
        throw new Error(
            "useTabSession must be used within a TabSessionProvider"
        );
    }
    return context;
};

export const MockTabSessionProvider = ({
    children,
    id = 1,
    url = "https://example.com",
    dimensions = { width: 800, height: 600 }
}: {
    children: React.ReactNode;
    id?: number;
    url?: string;
    dimensions?: { width: number; height: number };
}) => {
    return (
        <TabSessionContext.Provider
            value={{
                id,
                url,
                dimensions
            }}>
            {children}
        </TabSessionContext.Provider>
    );
};
