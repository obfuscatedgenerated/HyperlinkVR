const VR_HOST_URL = "./tabs/vr_host.html";

const VR_HOST_WIDTH = 750;
const VR_HOST_HEIGHT = 450;

// Replace your onInstalled listener with this development-friendly version:
chrome.contextMenus.removeAll(() => {
    // TODO: check if launch allowed in context (not protected page)

    chrome.contextMenus.create(
        {
            id: "launch-viewportvr",
            title: "Launch ViewportVR",
            contexts: ["all"],
            documentUrlPatterns: ["<all_urls>"]
        },
        () => {
            // Catch any errors silently if Chrome complains about duplicates
            if (chrome.runtime.lastError) {
            }
        }
    );
});

let interacted_tab_id: number | null = null;

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "launch-viewportvr") {
        interacted_tab_id = tab.id || null;

        chrome.windows.create({
            url: VR_HOST_URL,
            type: "popup",
            width: VR_HOST_WIDTH,
            height: VR_HOST_HEIGHT
        });
    }
});

// resolve background url to safe ones (converting ../ to actual back steps) for comparison
const REAL_SPECTATOR_URL = new URL(VR_HOST_URL, location.href).href;

chrome.runtime.onMessage.addListener((msg, sender) => {
    let dropped = true;
    console.table([msg, sender.url]);

    // handle messages meant directly for the background script
    // TODO: clean up and use switch
    if (msg.action === "VVR_START_STREAM") {
        chrome.tabCapture.getMediaStreamId(
            { targetTabId: interacted_tab_id },
            (stream_id) => {
                if (stream_id) {
                    chrome.tabs.get(interacted_tab_id!, (tab) => {
                        chrome.runtime.sendMessage({
                            type: "VVR_STREAM",
                            stream: stream_id,
                            tab: {
                                id: tab.id,
                            }
                        });

                        chrome.runtime.sendMessage({
                            type: "VVR_DIMENSIONS_UPDATE",
                            tab: {
                                id: tab.id,
                                width: tab.width,
                                height: tab.height
                            }
                        });

                        chrome.runtime.sendMessage({
                            type: "VVR_URL_UPDATE",
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
        // set interacted tab id to the active one
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].id) {
                interacted_tab_id = tabs[0].id;
            }

            chrome.windows.create({
                url: VR_HOST_URL,
                type: "popup",
                width: VR_HOST_WIDTH,
                height: VR_HOST_HEIGHT
            });
        });

        dropped = false;
    } else if (msg.action === "VVR_CLICK") {
        handle_click(msg);
        dropped = false;
    }

    if (msg.target === "cs" && sender.url === REAL_SPECTATOR_URL) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].id) {
                chrome.tabs.sendMessage(tabs[0].id, msg);
                dropped = false;
            }
        });
    }

    if (msg.target === "vr-host" && sender.url === REAL_SPECTATOR_URL) {
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
            tab: {
                id: tab.id,
                width: tab.width,
                height: tab.height
            }
        });
    }
});

// alert the vr host of changes in url
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url) {
        chrome.runtime.sendMessage({
            type: "VVR_URL_UPDATE",
            url: changeInfo.url
        });
    }
});

const handle_click = (msg: any) => {
    chrome.storage.sync.get("settings.use_debug_input", (data) => {
        const use_debug_input = data["settings.use_debug_input"] === "true" || false;

        if (use_debug_input) {
            console.error("not yet implemented!!!!!");
        } else {
            // forward event to the active tab's content script
            chrome.tabs.sendMessage(interacted_tab_id, msg);
        }
    });
}

// TODO: handle debugger attachment in response to setting changing, only if activated

// TODO: end session when source tab closes
// TODO: tab hopping
// TODO: user input relay
// TODO: make sure tab is correct one before dispatching updates
