import { ExtensionStorage } from "@hyperlinkvr/platform-extension";
import type { WindowIntent } from "@hyperlinkvr/types";
import { handle_web_sdk } from "@hyperlinkvr/web-sdk-handlers";
import { defineBackground } from "#imports";



import { check_url_allowed, URL_PATTERNS } from "~/util/url_patterns";


// TODO: this whole script deserves a rewrite


export default defineBackground(() => {
    const VR_HOST_URL = "./vr_host.html";

    const VR_HOST_WIDTH = 750;
    const VR_HOST_HEIGHT = 450;

    const storage_engines = {
        local: new ExtensionStorage("local"),
        session: new ExtensionStorage("session"),
        sync: new ExtensionStorage("sync")
    };

    const WINDOW_INTENTS = {
        LOGIN: "/login.html",
        DEVTOOLS: "/devtools.html",
        DEVTOOLS_FORM: "/devtools-form.html",
        DEVTOOLS_WATCH_UI: "/devtools-watch.html"
    } as Record<WindowIntent, string>;

    const get_window_url = (
        intent: WindowIntent,
        args?: Record<string, any>
    ) => {
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

    interface ActiveSession {
        tab_id: number;
        window_id: number;
        ready_port: chrome.runtime.Port | null;
    }

    // only one vr host is allowed at a time to prvent sync issues
    let active_session: ActiveSession | null = null;

    const resolve_real_host_url = () => new URL(VR_HOST_URL, location.href).href;
    const REAL_HOST_URL = resolve_real_host_url();

    const launch_vr_host = (tab_id: number) => {
        if (active_session) {
            if (active_session.tab_id === tab_id) {
                // already open for this tab, just refocus it
                chrome.windows.update(active_session.window_id, { focused: true });
                return;
            }

            // a session is already active for a different tab, bring it forward instead
            // TODO: should we offer to transfer the session to this tab?
            console.warn(
                "HyperlinkVR session already active for tab",
                active_session.tab_id,
                "- ignoring launch request for tab",
                tab_id
            );
            chrome.windows.update(active_session.window_id, { focused: true });
            return;
        }

        chrome.windows.create(
            {
                url: `${VR_HOST_URL}?tab=${tab_id}`,
                type: "popup",
                width: VR_HOST_WIDTH,
                height: VR_HOST_HEIGHT
            },
            (win) => {
                if (!win?.id) {
                    console.error("Failed to create VR host window");
                    return;
                }

                active_session = {
                    tab_id,
                    window_id: win.id,
                    ready_port: null
                };
            }
        );
    };

    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create(
            {
                id: "launch-hyperlinkvr",
                title: "Launch HyperlinkVR",
                contexts: ["all"],
                documentUrlPatterns: URL_PATTERNS
            },
            () => {
                if (chrome.runtime.lastError) {
                }
            }
        );
    });

    chrome.contextMenus.onClicked.addListener((info, tab) => {
        if (info.menuItemId === "launch-hyperlinkvr") {
            if (!check_url_allowed(tab?.url || "")) {
                console.error("URL not allowed for HyperlinkVR:", tab?.url);
                return;
            }

            if (!tab?.id) {
                console.error("No tab id available for HyperlinkVR launch");
                return;
            }

            launch_vr_host(tab.id);
        }
    });

    chrome.action.setBadgeTextColor({
        color: "#fff"
    });

    // hvr-ready:<tab_id>: opened by the VR host's WebSDKMessagingProvider for the duration of its RTC session to signal it is ready to receive connections
    // hvr-tab-session:<tab_id>: opened by TabSessionProvider on mount, so we can push the url and dimensions specifically when ready
    chrome.runtime.onConnect.addListener((port) => {
        const ready_match = port.name.match(/^hvr-ready:(\d+)$/);
        if (ready_match) {
            const tab_id = parseInt(ready_match[1], 10);

            if (!active_session || active_session.tab_id !== tab_id) {
                port.disconnect();
                return;
            }

            active_session.ready_port = port;
            chrome.tabs.sendMessage(tab_id, { type: "HVRSDK_READY" }).catch(() => {});

            port.onDisconnect.addListener(() => {
                if (active_session?.tab_id === tab_id) {
                    active_session.ready_port = null;
                }
            });
            return;
        }

        const session_match = port.name.match(/^hvr-tab-session:(\d+)$/);
        if (session_match) {
            const tab_id = parseInt(session_match[1], 10);

            chrome.tabs.get(tab_id, (tab) => {
                if (chrome.runtime.lastError || !tab) return;

                port.postMessage({
                    type: "HVR_URL_UPDATE",
                    tab: tab_id,
                    url: tab.url
                });

                port.postMessage({
                    type: "HVR_DIMENSIONS_UPDATE",
                    tab: tab_id,
                    width: tab.width,
                    height: tab.height
                });
            });
            return;
        }
    });

    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        let dropped = true;
        console.table([msg, sender.url]);

        // handle web sdk messages (which expect direct replies for correlation)
        if (msg.action && msg.action.startsWith("HVRSDK_") && msg.target !== "cs") {
            // any rtc lifecycle messages should be deferred to the rtc host instead to facilitate direct connection
            if (msg.action.startsWith("HVRSDK_RTC_")) {
                // authorize + stamp, then forward to the host explicitly.
                // do NOT let the host consume the raw page broadcast anymore.
                if (!active_session || active_session.tab_id !== sender.tab?.id) {
                    console.warn("Rejecting RTC message from non-session tab", sender.tab?.id);
                    dropped = false;
                    return;
                }

                let origin: string | undefined;
                try {
                    origin = sender.origin ?? (sender.url ? new URL(sender.url).origin : undefined);
                } catch { origin = undefined; }

                chrome.runtime.sendMessage({
                    ...msg,
                    target: "vr-host",
                    stamped: true,
                    tab: sender.tab.id,
                    origin
                });

                dropped = false;
                return;
            }

            if (msg.action === "HVRSDK_META") {
                // TODO: should there be an option that calls openPopup to indicate only vr content exists, or is that obnoxious

                if (msg.content === "disable") {
                    chrome.action.setBadgeText({
                        tabId: sender.tab.id,
                    });
                } else {
                    chrome.action.setBadgeText({
                        tabId: sender.tab.id,
                        text: "✓"
                    });
                }
                dropped = false;
                return;
            }

            // is the VR host currently ready for this sender's tab? (pull, for late-loading content scripts)
            if (msg.action === "HVRSDK_QUERY_READY") {
                const ready =
                    !!active_session &&
                    active_session.tab_id === sender.tab?.id &&
                    active_session.ready_port !== null;

                chrome.tabs.sendMessage(sender.tab.id!, {
                    type: "HVRSDK_READY",
                    ready: ready
                });
                dropped = false;
                return;
            }

            // otherwise we assume this is for us
            handle_web_sdk({
                message: msg,
                storage: storage_engines
            })
                .then((response) => {
                    if (response) {
                        sendResponse(response);
                    } else {
                        // we were asked to handle a message which should be deferred to the vr host over rtc
                        sendResponse({ error: "Message must be sent over RTC" });
                    }
                })
                .catch((error) => {
                    // TODO: handle errors in web-sdk to prevent freeze
                    console.error(
                        "Error handling SDK message:",
                        msg,
                        "Error:",
                        error
                    );
                    sendResponse({ error: error.message || "Unknown error" });
                });
            dropped = false;

            // tell cs to wait for the response!
            return true;
        }

        // handle messages meant directly for the background script
        // TODO: clean up and use switch/command pattern
        if (msg.action === "HVR_START_STREAM") {
            chrome.tabCapture.getMediaStreamId(
                { targetTabId: msg.tab },
                (stream_id) => {
                    if (stream_id) {
                        chrome.tabs.get(msg.tab, (tab) => {
                            chrome.runtime.sendMessage({
                                type: "HVR_STREAM",
                                stream: stream_id,
                                tab: tab.id
                            });

                            chrome.runtime.sendMessage({
                                type: "HVR_DIMENSIONS_UPDATE",
                                tab: tab.id,
                                width: tab.width,
                                height: tab.height
                            });

                            chrome.runtime.sendMessage({
                                type: "HVR_URL_UPDATE",
                                tab: tab.id,
                                url: tab.url
                            });
                        });
                    } else {
                        console.error(
                            "Failed to capture tab:",
                            JSON.stringify(chrome.runtime.lastError)
                        );
                    }
                }
            );

            dropped = false;
        } else if (msg.action === "HVR_LAUNCH") {
            if (!msg.tab) {
                console.error("No tab specified for HVR_LAUNCH");
                return;
            }

            chrome.tabs.get(msg.tab, (tab) => {
                if (!check_url_allowed(tab.url || "")) {
                    console.error("URL not allowed for HyperlinkVR:", tab.url);
                    return;
                }

                launch_vr_host(tab.id!);
            });

            dropped = false;
        } else if (msg.action === "HVR_CLICK") {
            handle_click(msg);
            dropped = false;
        } else if (msg.action === "HVR_CREATE_WINDOW") {
            const window_url = get_window_url(msg.intent, msg.args);
            if (!window_url) {
                console.error(
                    "Failed to create window: unknown intent",
                    msg.intent
                );
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

        if (
            msg.target === "vr-host" &&
            !sender.url?.startsWith(REAL_HOST_URL)
        ) {
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
                type: "HVR_DIMENSIONS_UPDATE",
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
                type: "HVR_URL_UPDATE",
                tab: tabId,
                url: changeInfo.url
            });
        }
    });

    // alert the vr host of the session closing
    chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
        chrome.runtime.sendMessage({
            type: "HVR_TAB_CLOSED",
            tab: tabId
        });

        if (active_session?.tab_id === tabId) {
            active_session = null;
        }
    });

    // clear the active session if its window is closed directly
    chrome.windows.onRemoved.addListener((window_id) => {
        if (active_session?.window_id === window_id) {
            active_session = null;
        }
    });

    const handle_click = (msg: any) => {
        chrome.storage.sync.get("settings.use_debug_input", (data) => {
            const use_debug_input =
                data["settings.use_debug_input"] === "true" || false;

            if (use_debug_input) {
                console.error("not yet implemented!!!!!");
            } else {
                // forward event to the active tab's content script
                chrome.tabs.sendMessage(msg.tab, msg);
            }
        });
    };

    // TODO: handle debugger attachment in response to setting changing, only if activated

    // TODO: tab hopping
});

// TODO: should some of this be abstracted to a package? i think the sdk handling mostly could be when it comes around. anything not requiring special backend privileges can be abstracted