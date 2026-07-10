import { useThree } from "@react-three/fiber";
import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode
} from "react";

// TODO: controller support
// TODO: crouch
// TODO: sprint both here and in xr

// these dont trigger state update and should instead be read every frame
export interface FlatFrameInput {
    move: { x: number; y: number }; // x = strafe (+right), y = forward (+fwd)
    look: { x: number; y: number }; // mouse delta this frame
    grab: boolean; // grab key / RMB
    use: boolean; // LMB
    jump: boolean;
    sprint: boolean; // shift TODO: toggle sprint option
}

const frame_input: FlatFrameInput = {
    move: { x: 0, y: 0 },
    look: { x: 0, y: 0 },
    grab: false,
    use: false,
    jump: false,
    sprint: false
};

export const useFlatFrameInput = (): FlatFrameInput => frame_input;


// these are toggles which cause re-renders
export interface FlatInputState {
    watch_presented: boolean; // Tab: present the watch (also frees the cursor)
    cursor_free: boolean; // true if the watch is presented or explicitly freed with Alt
}

const FlatInputStateContext = createContext<FlatInputState | null>(null);

export const useFlatInputState = (): FlatInputState => {
    const value = useContext(FlatInputStateContext);
    if (value === null) {
        throw new Error("useFlatInputState must be used within a FlatInputProvider");
    }
    return value;
};

const keys = new Set<string>();
const recompute_move = () => {
    frame_input.move.x = (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0);
    frame_input.move.y = (keys.has("KeyW") ? 1 : 0) - (keys.has("KeyS") ? 1 : 0);
};

export const FlatInputProvider = ({ children }: { children: ReactNode }) => {
    const { gl } = useThree();

    const [watch_presented, set_watch_presented] = useState(false);
    const [cursor_free, set_cursor_free] = useState(false);

    const ui_state = useMemo<FlatInputState>(
        () => ({ watch_presented, cursor_free }),
        [watch_presented, cursor_free]
    );

    useEffect(() => {
        const canvas = gl.domElement;

        let cursor_free_explicit = false;
        let watch_presented_local = false;

        const apply_cursor = (next_watch_presented: boolean) => {
            const next_cursor_free = cursor_free_explicit || next_watch_presented;

            if (next_cursor_free) {
                if (document.pointerLockElement === canvas) {
                    document.exitPointerLock();
                }
            } else {
                if (document.pointerLockElement !== canvas) {
                    canvas.requestPointerLock();
                }
            }

            set_cursor_free(next_cursor_free);
        };

        const on_key = (down: boolean) => (event: KeyboardEvent) => {
            if (event.code === "Tab") {
                if (down) {
                    event.preventDefault();
                    watch_presented_local = !watch_presented_local;
                    set_watch_presented(watch_presented_local);
                    apply_cursor(watch_presented_local);
                }
                return;
            }
            if (event.code === "AltLeft") {
                if (down) {
                    event.preventDefault();
                    cursor_free_explicit = !cursor_free_explicit;
                    apply_cursor(watch_presented_local);
                }
                return;
            }
            if (down) {
                keys.add(event.code);
            } else {
                keys.delete(event.code);
            }

            frame_input.jump = keys.has("Space");
            frame_input.sprint = keys.has("ShiftLeft") || keys.has("ShiftRight");

            if (!watch_presented_local) {
                recompute_move();
            }
        };

        const on_keydown = on_key(true);
        const on_keyup = on_key(false);

        const on_mousemove = (event: MouseEvent) => {
            if (document.pointerLockElement !== canvas) return; // only when locked (look mode)
            frame_input.look.x += event.movementX;
            frame_input.look.y += event.movementY;
        };

        // click canvas to (re)capture look. while locked, RMB = grab, LMB = use
        // world-UI clicks are handled separately by FlatClickRaycaster
        const on_down = (event: MouseEvent) => {
            const locked = document.pointerLockElement === canvas;
            if (!locked && !cursor_free_explicit && !watch_presented_local) {
                canvas.requestPointerLock();
                return;
            }

            if (!locked) return; // only arm world buttons while actually locked

            if (event.button === 0) frame_input.use = true;
            if (event.button === 2) frame_input.grab = true;
        };
        const on_up = (event: MouseEvent) => {
            if (event.button === 0) frame_input.use = false;
            if (event.button === 2) frame_input.grab = false;
        };

        const no_context = (event: Event) => event.preventDefault(); // RMB is grab, not a menu

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

    return (
        <FlatInputStateContext.Provider value={ui_state}>{children}</FlatInputStateContext.Provider>
    );
};
