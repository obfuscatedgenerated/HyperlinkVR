import { defineContentScript } from "#imports";

export default defineContentScript({
    matches: ["<all_urls>"],
    runAt: "document_end",
    main() {
        // sniff for a <meta name="hyperlinkvr" tag to define special behaviour
        // values:
        // - supported (tells the host to show a loading screen until connecting)
        // - defer (tells the host to display the fallback dom mirror as usual but listen for connections still)
        // - disable, which tells the host to not inject the sdk at all and just let the page run as normal via dom mirror (the default) (TODO: implement, can we if we need to inject api at doc start?)
        const meta_tag = document.querySelector("meta[name=\"hyperlinkvr\"]");
        if (meta_tag) {
            const content = meta_tag.getAttribute("content");
            chrome.runtime.sendMessage({
                action: "HVRSDK_META",
                content: content || "disable"
            });
        }
    }
});

