let debug_hits = false;

// set initial value from storage
chrome.storage.sync.get("settings.debug_hits", (data) => {
    debug_hits = data["settings.debug_hits"] || false;
});

// listen for changes to the setting
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && changes["settings.debug_hits"]) {
        debug_hits = changes["settings.debug_hits"].newValue;
    }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "VVR_CLICK") {
        const { x, y } = msg.pos;
        const button = msg.button || 0;
        console.log(`Received click at (${x}, ${y}) with button ${button}`);

        if (debug_hits) {
            // render a dot for debugging
            const dot = document.createElement("div");
            dot.style.position = "absolute";
            dot.style.left = `${x}px`;
            dot.style.top = `${y}px`;
            dot.style.width = "10px";
            dot.style.height = "10px";
            dot.style.transform = "translate(-50%, -50%)";
            dot.style.backgroundColor = "red";
            dot.style.borderRadius = "50%";
            dot.style.zIndex = "9999";
            document.body.appendChild(dot);
            setTimeout(() => {
                document.body.removeChild(dot);
            }, 1000);
        }

        // find the element at the click position
        const el = document.elementFromPoint(x, y);
        if (!el) {
            return;
        }

        // focus the element if focusable
        if (el instanceof HTMLElement) {
            el.focus();
        }

        // what a silly api!
        const button_to_buttons: Record<number, number> = {
            0: 1, // left   (button 0 -> bitmask 1)
            1: 4, // middle (button 1 -> bitmask 4)
            2: 2 // right  (button 2 -> bitmask 2)
        };

        const event_opts = {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: x,
            clientY: y,
            button,
            buttons: button_to_buttons[button] || 1,
            pointerId: 1,
            pointerType: "mouse"
        };

        // dispatch full pointer-mouse lifecycle
        el.dispatchEvent(new PointerEvent("pointerdown", event_opts));
        el.dispatchEvent(new MouseEvent("mousedown", event_opts));

        // release the button
        event_opts.buttons = 0;

        el.dispatchEvent(new PointerEvent("pointerup", event_opts));
        el.dispatchEvent(new MouseEvent("mouseup", event_opts));

        // and dispatch a contextual click event
        if (button === 2) {
            el.dispatchEvent(new MouseEvent("contextmenu", event_opts));
        } else if (button === 1) {
            el.dispatchEvent(new MouseEvent("auxclick", event_opts));
        } else {
            el.dispatchEvent(new MouseEvent("click", event_opts));
        }
    }
});
