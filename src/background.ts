const VR_HOST_URL = "./tabs/vr_host.html";

// Replace your onInstalled listener with this development-friendly version:
chrome.contextMenus.removeAll(() => {
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
            width: 800,
            height: 600
        });
    }
});

// resolve background url to safe ones (converting ../ to actual back steps) for comparison
const REAL_SPECTATOR_URL = new URL(VR_HOST_URL, location.href).href;

chrome.runtime.onMessage.addListener((msg, sender) => {
    console.table([msg, sender.url]);

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
                                width: tab.width,
                                height: tab.height
                            }
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
    }

    let dropped = true;

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
