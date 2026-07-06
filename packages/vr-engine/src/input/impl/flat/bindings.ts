import { useThree } from "@react-three/fiber";
import { useEffect } from "react";

// TODO: controller support

export interface FlatInputState {
    move: { x: number; y: number }; // x = strafe (+right), y = forward (+fwd)
    look: { x: number; y: number }; // mouse delta this frame
    grab: boolean; // grab key / RMB
    use: boolean; // LMB
    jump: boolean;
    watch_presented: boolean; // tab to open watch which also frees cursor
    cursor_free: boolean; // set true if watch presented or explictly freed with alt
}

const state: FlatInputState = {
    move: { x: 0, y: 0 },
    look: { x: 0, y: 0 },
    grab: false,
    use: false,
    jump: false,
    watch_presented: false,
    cursor_free: false
};

const keys = new Set<string>();
const recompute_move = () => {
    state.move.x = (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0);
    state.move.y = (keys.has("KeyW") ? 1 : 0) - (keys.has("KeyS") ? 1 : 0);
};

export const useFlatInput = (): FlatInputState => {
    const { gl } = useThree();

    useEffect(() => {
        const canvas = gl.domElement;

        let cursor_free_explicit = false; // Alt — free cursor without the watch

        const sync_cursor = (canvas: HTMLElement) => {
            // cursor is free if either reason holds
            state.cursor_free = cursor_free_explicit || state.watch_presented;
            if (state.cursor_free) {
                if (document.pointerLockElement === canvas)
                    document.exitPointerLock();
            } else {
                if (document.pointerLockElement !== canvas)
                    canvas.requestPointerLock();
            }
        };

        const on_key = (down: boolean) => (e: KeyboardEvent) => {
            if (e.code === "Tab") {
                if (down) {
                    e.preventDefault();
                    state.watch_presented = !state.watch_presented;
                    sync_cursor(canvas);
                }
                return;
            }
            if (e.code === "AltLeft") {
                if (down) {
                    e.preventDefault();
                    cursor_free_explicit = !cursor_free_explicit;
                    sync_cursor(canvas);
                }
                return;
            }
            if (down) keys.add(e.code);
            else keys.delete(e.code);
            state.jump = keys.has("Space");
            recompute_move();
        };

        const on_keydown = on_key(true), on_keyup = on_key(false);

        const on_mousemove = (e: MouseEvent) => {
            if (document.pointerLockElement !== canvas) return; // only when locked (look mode)
            state.look.x += e.movementX;
            state.look.y += e.movementY;
        };

        // click canvas to (re)capture look, buttons map to use/grab while locked
        const on_down = (e: MouseEvent) => {
            if (document.pointerLockElement !== canvas && !state.cursor_free) {
                canvas.requestPointerLock();
                return;
            }
            if (e.button === 0) state.use = true;
            if (e.button === 2) state.grab = true;
        };
        const on_up = (e: MouseEvent) => {
            if (e.button === 0) state.use = false;
            if (e.button === 2) state.grab = false;
        };

        const no_context = (e: Event) => e.preventDefault(); // RMB is grab, not a menu

        window.addEventListener("keydown", on_keydown);
        window.addEventListener("keyup", on_keyup);
        canvas.addEventListener("mousemove", on_mousemove);
        canvas.addEventListener("mousedown", on_down);
        window.addEventListener("mouseup", on_up);
        canvas.addEventListener("contextmenu", no_context);

        return () => {
            window.removeEventListener("keydown", on_keydown);
            window.removeEventListener("keyup", on_keyup);
            canvas.removeEventListener("mousemove", on_mousemove);
            canvas.removeEventListener("mousedown", on_down);
            window.removeEventListener("mouseup", on_up);
            canvas.removeEventListener("contextmenu", no_context);
            keys.clear();
        };
    }, [gl]);

    return state;
};
