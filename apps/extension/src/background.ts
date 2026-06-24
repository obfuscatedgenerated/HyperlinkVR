import { check_url_allowed, URL_PATTERNS } from "~util/url_patterns";

const VR_HOST_URL = "./tabs/vr_host.html";

const VR_HOST_WIDTH = 750;
const VR_HOST_HEIGHT = 450;

const WINDOW_INTENTS = {
    DEVTOOLS_FORM: "./tabs/devtools-form.html",
    DEVTOOLS_WATCH_UI: "./tabs/devtools-watch.html"
}

const get_window_url = (intent: string, args?: Record<string, any>) => {
    const base_url = WINDOW_INTENTS[intent];
    if (!base_url) {
        console.error("Unknown window intent:", intent);
        return null;
    }

    const url = new URL(base_url, location.href);
    if (args) {
        Object.entries(args).forEach(([key, value]) => {
            url.searchParams.set(key, value);
        });
    }

    return url.href;
};

// Replace your onInstalled listener with this development-friendly version:
chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create(
        {
            id: "launch-viewportvr",
            title: "Launch ViewportVR",
            contexts: ["all"],
            documentUrlPatterns: URL_PATTERNS
        },
        () => {
            // Catch any errors silently if Chrome complains about duplicates
            if (chrome.runtime.lastError) {
            }
        }
    );
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "launch-viewportvr") {
        if (!check_url_allowed(tab?.url || "")) {
            console.error("URL not allowed for ViewportVR:", tab?.url);
            return;
        }

        chrome.windows.create({
            url: `${VR_HOST_URL}?tab=${tab?.id}`,
            type: "popup",
            width: VR_HOST_WIDTH,
            height: VR_HOST_HEIGHT
        });
    }
});

// resolve background url to safe ones (converting ../ to actual back steps) for comparison
const REAL_HOST_URL = new URL(VR_HOST_URL, location.href).href;

chrome.runtime.onMessage.addListener((msg, sender) => {
    let dropped = true;
    console.table([msg, sender.url]);

    // handle messages meant directly for the background script
    // TODO: clean up and use switch
    if (msg.action === "VVR_START_STREAM") {
        chrome.tabCapture.getMediaStreamId(
            { targetTabId: msg.tab },
            (stream_id) => {
                if (stream_id) {
                    chrome.tabs.get(msg.tab, (tab) => {
                        chrome.runtime.sendMessage({
                            type: "VVR_STREAM",
                            stream: stream_id,
                            tab: tab.id
                        });

                        chrome.runtime.sendMessage({
                            type: "VVR_DIMENSIONS_UPDATE",
                            tab: tab.id,
                            width: tab.width,
                            height: tab.height

                        });

                        chrome.runtime.sendMessage({
                            type: "VVR_URL_UPDATE",
                            tab: tab.id,
                            url: tab.url
                        });
                    });
                } else {
                    console.error(
                        "Failed to capture tab:",
                        chrome.runtime.lastError
                    );
                }
            }
        );

        dropped = false;
    } else if (msg.action === "VVR_LAUNCH") {
        if (!msg.tab) {
            console.error("No tab specified for VVR_LAUNCH");
            return;
        }

        chrome.tabs.get(msg.tab, (tab) => {
            if (!check_url_allowed(tab.url || "")) {
                console.error("URL not allowed for ViewportVR:", tab.url);
                return;
            }

            chrome.windows.create({
                url: `${VR_HOST_URL}?tab=${tab.id}`,
                type: "popup",
                width: VR_HOST_WIDTH,
                height: VR_HOST_HEIGHT
            });
       });

        dropped = false;
    } else if (msg.action === "VVR_CLICK") {
        handle_click(msg);
        dropped = false;
    } else if (msg.action === "VVR_CREATE_WINDOW") {
        const window_url = get_window_url(msg.intent, msg.args);
        if (!window_url) {
            console.error("Failed to create window: unknown intent", msg.intent);
            return;
        }

        chrome.windows.create({
            url: window_url,
            type: msg.type || "popup",
            width: msg.width || 800,
            height: msg.height || 600
        });

        dropped = false;
    }

    // TODO: subscription based routing
    if (msg.target === "cs" && sender.url?.startsWith(REAL_HOST_URL)) {
        chrome.tabs.sendMessage(msg.tab, msg);
        dropped = false;
    }

    if (msg.target === "vr-host" && !sender.url?.startsWith(REAL_HOST_URL)) {
        chrome.runtime.sendMessage(msg);
        dropped = false;
    }

    if (dropped) {
        console.warn("Dropped message:", msg, "from sender:", sender.url);
    }
});

// alert the vr host of resizes of the active tab
chrome.windows.onBoundsChanged.addListener(async (window) => {
    const [tab] = await chrome.tabs.query({
        active: true,
        windowId: window.id
    });

    if (tab && tab.id) {
        chrome.runtime.sendMessage({
            type: "VVR_DIMENSIONS_UPDATE",
            tab: tab.id,
            width: tab.width,
            height: tab.height
        });
    }
});

// alert the vr host of changes in url
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url) {
        chrome.runtime.sendMessage({
            type: "VVR_URL_UPDATE",
            tab: tabId,
            url: changeInfo.url
        });
    }
});

// alert the vr host of the session closing
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
    chrome.runtime.sendMessage({
        type: "VVR_TAB_CLOSED",
        tab: tabId
    });
});

const handle_click = (msg: any) => {
    chrome.storage.sync.get("settings.use_debug_input", (data) => {
        const use_debug_input = data["settings.use_debug_input"] === "true" || false;

        if (use_debug_input) {
            console.error("not yet implemented!!!!!");
        } else {
            // forward event to the active tab's content script
            chrome.tabs.sendMessage(msg.tab, msg);
        }
    });
}

// TODO: handle debugger attachment in response to setting changing, only if activated

// TODO: tab hopping
