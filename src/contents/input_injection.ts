chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "VVR_CLICK") {
        const { x, y, button } = msg.pos;

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
