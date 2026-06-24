import { createContext, useContext, useEffect, useState } from "react";
import { useMessageEngine } from "./engines";
import { useWindowArguments } from "./windowing";

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

    const { tab } = window_data;

    const messenger = useMessageEngine();

    const [url, setUrl] = useState<string | null>(null);
    const [dimensions, setDimensions] = useState<{
        width: number;
        height: number;
    } | null>(null);

    // listen for tab close
    useEffect(() => {
        const handle_message = (msg: any) => {
            // TODO: switch
            if (msg.type === "VVR_TAB_CLOSED" && msg.tab === tab) {
                // just close for now as tab hopping isnt yet implemented
                window.close();
            }

            if (msg.type === "VVR_URL_UPDATE") {
                setUrl(msg.url);
            }

            if (msg.type === "VVR_DIMENSIONS_UPDATE") {
                setDimensions({
                    width: msg.width,
                    height: msg.height
                });
            }
        };

        // TODO: actively fetch url and dimensions in case missed, currently a race

        const unlisten = messenger.listen(handle_message);
        return () => unlisten();
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
