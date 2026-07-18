import { useFrame, useThree } from "@react-three/fiber";
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode
} from "react";
import { useSetHintState } from "./hints";

// TODO: crouch
// TODO: sprint toggle option, both here and in xr

// these dont trigger state update and should instead be read every frame
export interface FlatFrameInput {
    move: { x: number; y: number }; // x = strafe (+right), y = forward (+fwd)
    look: { x: number; y: number }; // look delta this frame (mouse px units)
    grab: boolean; // grab key / RMB / L trigger
    use: boolean; // LMB / R trigger
    jump: boolean;
    sprint: boolean; // shift / L stick press
    throw_held: boolean;
}

const frame_input: FlatFrameInput = {
    move: { x: 0, y: 0 },
    look: { x: 0, y: 0 },
    grab: false,
    use: false,
    jump: false,
    sprint: false,
    throw_held: false
};

export const useFlatFrameInput = (): FlatFrameInput => frame_input;

// these are toggles which cause re-renders
export interface FlatInputState {
    watch_presented: boolean; // Tab / Start: present the watch (also frees the cursor)
    cursor_free: boolean; // true if the watch is presented or explicitly freed with Alt / Select
}

const FlatInputStateContext = createContext<FlatInputState | null>(null);

export const useFlatInputState = (): FlatInputState => {
    const value = useContext(FlatInputStateContext);
    if (value === null) {
        throw new Error("useFlatInputState must be used within a FlatInputProvider");
    }
    return value;
};

enum StandardControllerInput {
    FACE_BOTTOM = 0, // xbox: A, ps: Cross, nintendo: B
    FACE_RIGHT = 1, // xbox: B, ps: Circle, nintendo: A
    FACE_LEFT = 2, // xbox: X, ps: Square, nintendo: Y
    FACE_TOP = 3, // xbox: Y, ps: Triangle, nintendo: X
    L_BUMPER = 4,
    R_BUMPER = 5,
    L_TRIGGER = 6,
    R_TRIGGER = 7,
    SELECT = 8, // xbox: View, ps: Share, nintendo: Minus
    START = 9, // xbox: Menu, ps: Options, nintendo: Plus
    L_STICK_PRESS = 10,
    R_STICK_PRESS = 11,
    DPAD_UP = 12,
    DPAD_DOWN = 13,
    DPAD_LEFT = 14,
    DPAD_RIGHT = 15,
    HOME = 16 // xbox: Xbox, ps: PS, nintendo: Home
}

const keys = new Set<string>();
const mouse_buttons = { use: false, grab: false };

const PAD_DEADZONE = 0.15; // radial. TODO: useSetting, drifting sticks need to raise this
const PAD_TRIGGER_PRESS = 0.55; // hysteresis so analog triggers dont flutter at the threshold
const PAD_TRIGGER_RELEASE = 0.45;
const PAD_LOOK_SPEED = 900; // equivalent mouse px per second at full deflection TODO: stick sensitivity setting

interface StickVector {
    x: number;
    y: number;
}

const apply_radial_deadzone = (raw_x: number, raw_y: number, out: StickVector) => {
    const length = Math.hypot(raw_x, raw_y);
    if (length < PAD_DEADZONE) {
        out.x = 0;
        out.y = 0;
        return;
    }
    const scaled = Math.min(1, (length - PAD_DEADZONE) / (1 - PAD_DEADZONE));
    out.x = (raw_x / length) * scaled;
    out.y = (raw_y / length) * scaled;
};

export const FlatInputProvider = ({ children }: { children: ReactNode }) => {
    const { gl } = useThree();

    const [watch_presented, set_watch_presented] = useState(false);
    const [cursor_free, set_cursor_free] = useState(false);

    const ui_state = useMemo<FlatInputState>(
        () => ({ watch_presented, cursor_free }),
        [watch_presented, cursor_free]
    );

    const { add_layer, remove_layer } = useSetHintState();
    // TODO: inline hint device setting here rather than sep component

    const watch_presented_ref = useRef(false);
    const cursor_free_explicit = useRef(false);

    const apply_cursor = useCallback(() => {
        const canvas = gl.domElement;
        const next_cursor_free = cursor_free_explicit.current || watch_presented_ref.current;

        if (next_cursor_free) {
            if (document.pointerLockElement === canvas) {
                document.exitPointerLock();
            }
        } else if (document.pointerLockElement !== canvas) {
            // when there is no user gesture (e.g. from controller), the request can reject, but its not a big deal
            try {
                const lock_result = canvas.requestPointerLock() as unknown as
                    | Promise<void>
                    | undefined;
                lock_result?.catch(() => {});
            } catch {
                // ignored
            }
        }

        set_cursor_free(next_cursor_free);
    }, [gl.domElement]);

    const toggle_watch = useCallback(() => {
        watch_presented_ref.current = !watch_presented_ref.current;
        set_watch_presented(watch_presented_ref.current);
        apply_cursor();
    }, [apply_cursor]);

    const toggle_cursor_free = useCallback(() => {
        cursor_free_explicit.current = !cursor_free_explicit.current;
        apply_cursor();
    }, [apply_cursor]);

    useEffect(() => {
        const canvas = gl.domElement;

        const on_key = (down: boolean) => (event: KeyboardEvent) => {
            if (event.code === "Tab") {
                if (down) {
                    event.preventDefault();
                    toggle_watch();
                }
                return;
            }
            if (event.code === "AltLeft") {
                if (down) {
                    event.preventDefault();
                    toggle_cursor_free();
                }
                return;
            }
            if (down) {
                keys.add(event.code);
            } else {
                keys.delete(event.code);
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
            if (!locked && !cursor_free_explicit.current && !watch_presented_ref.current) {
                canvas.requestPointerLock();
                return;
            }

            if (!locked) return; // only arm world buttons while actually locked

            if (event.button === 0) mouse_buttons.use = true;
            if (event.button === 2) mouse_buttons.grab = true;
        };
        const on_up = (event: MouseEvent) => {
            if (event.button === 0) mouse_buttons.use = false;
            if (event.button === 2) mouse_buttons.grab = false;
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
            mouse_buttons.use = false;
            mouse_buttons.grab = false;
        };
    }, [gl.domElement, toggle_watch, toggle_cursor_free]);

    const selected_pad_index = useRef(-1);
    const pad_grab_held = useRef(false);
    const pad_use_held = useRef(false);
    const pad_start_previous = useRef(false);
    const pad_select_previous = useRef(false);
    const stick_scratch = useRef<StickVector>({ x: 0, y: 0 });
    const pad_persisting_sprint = useRef(false);
    const pad_left_stick_click_previous = useRef(false);

    useFrame((_frame_state, delta) => {
        // most recently active standard-mapping pad wins, falling back to the last one used
        const gamepads = navigator.getGamepads();
        for (const candidate of gamepads) {
            if (!candidate || candidate.mapping !== "standard") continue;
            // TODO: warn when incompatible gamepad in us
            const candidate_active =
                candidate.buttons.some((button) => button.pressed) ||
                candidate.axes.some((axis_value) => Math.abs(axis_value) > PAD_DEADZONE);
            if (candidate_active) {
                selected_pad_index.current = candidate.index;
                break;
            }
        }
        const pad =
            selected_pad_index.current >= 0
                ? gamepads[selected_pad_index.current]
                : null;

        const watching = watch_presented_ref.current;
        const stick = stick_scratch.current;

        let pad_move_x = 0;
        let pad_move_y = 0;
        let pad_jump = false;
        let pad_sprint = false;
        let pad_throw = false;

        if (pad && pad.mapping === "standard") {
            const buttons = pad.buttons;

            // watch / free-cursor toggles on rising edge
            const start_pressed = buttons[StandardControllerInput.START]?.pressed ?? false;
            if (start_pressed && !pad_start_previous.current) toggle_watch();
            pad_start_previous.current = start_pressed;

            const select_pressed = buttons[StandardControllerInput.SELECT]?.pressed ?? false;
            if (select_pressed && !pad_select_previous.current) toggle_cursor_free();
            pad_select_previous.current = select_pressed;

            // trigger hysteresis
            const grab_value = buttons[StandardControllerInput.L_TRIGGER]?.value ?? 0;
            pad_grab_held.current =
                grab_value > (pad_grab_held.current ? PAD_TRIGGER_RELEASE : PAD_TRIGGER_PRESS);
            const use_value = buttons[StandardControllerInput.R_TRIGGER]?.value ?? 0;
            pad_use_held.current =
                use_value > (pad_use_held.current ? PAD_TRIGGER_RELEASE : PAD_TRIGGER_PRESS);

            // left stick movement
            apply_radial_deadzone(pad.axes[0] ?? 0, -(pad.axes[1] ?? 0), stick);
            pad_move_x = stick.x;
            pad_move_y = stick.y;

            // right stick look with squared response for fine aim, delta-scaled since stick look is a velocity
            if (!watching) {
                apply_radial_deadzone(pad.axes[2] ?? 0, pad.axes[3] ?? 0, stick);
                const response = Math.hypot(stick.x, stick.y); // extra factor => magnitude^2 overall
                frame_input.look.x += stick.x * response * PAD_LOOK_SPEED * delta;
                frame_input.look.y += stick.y * response * PAD_LOOK_SPEED * delta;
            }

            // sprint should toggle on until either toggled off or movement stops
            const is_moving = pad_move_x * pad_move_x + pad_move_y * pad_move_y > 0;

            if (pad_persisting_sprint && !is_moving) {
                pad_persisting_sprint.current = false;
            }

            if (buttons[StandardControllerInput.L_STICK_PRESS]?.pressed) {
                if (!pad_left_stick_click_previous.current) {
                    pad_persisting_sprint.current = !pad_persisting_sprint.current;
                }
                pad_left_stick_click_previous.current = true;
            } else {
                pad_left_stick_click_previous.current = false;
            }

            pad_sprint = pad_persisting_sprint.current;

            pad_jump = buttons[StandardControllerInput.FACE_BOTTOM]?.pressed ?? false;
            pad_throw = buttons[StandardControllerInput.FACE_LEFT]?.pressed ?? false;
        } else {
            pad_grab_held.current = false;
            pad_use_held.current = false;
        }

        // merge kbm and controller inputs
        const key_x = (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0);
        const key_y = (keys.has("KeyW") ? 1 : 0) - (keys.has("KeyS") ? 1 : 0);

        if (watching) {
            frame_input.move.x = 0;
            frame_input.move.y = 0;
        } else if (
            pad_move_x * pad_move_x + pad_move_y * pad_move_y >
            key_x * key_x + key_y * key_y
        ) {
            frame_input.move.x = pad_move_x;
            frame_input.move.y = pad_move_y;
        } else {
            frame_input.move.x = key_x;
            frame_input.move.y = key_y;
        }

        const sprint =
            keys.has("ShiftLeft") || keys.has("ShiftRight") || pad_sprint;
        const throw_held = keys.has("KeyF") || pad_throw;

        // manage hint layers
        if (sprint && !frame_input.sprint) {
            remove_layer("not_sprinting", true);
            add_layer("sprinting");
        } else if (!sprint && frame_input.sprint) {
            remove_layer("sprinting", true);
            add_layer("not_sprinting");
        }

        if (throw_held && !frame_input.throw_held) {
            add_layer("charging_throw");
        } else if (!throw_held && frame_input.throw_held) {
            remove_layer("charging_throw", true);
        }

        frame_input.sprint = sprint;
        frame_input.throw_held = throw_held;
        frame_input.jump = keys.has("Space") || pad_jump;
        frame_input.grab = mouse_buttons.grab || pad_grab_held.current;
        frame_input.use = mouse_buttons.use || pad_use_held.current;
    }, -10); // before default-priority consumers of frame_input

    return (
        <FlatInputStateContext.Provider value={ui_state}>
            {children}
        </FlatInputStateContext.Provider>
    );
};