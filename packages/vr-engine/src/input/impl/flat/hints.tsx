import "../../../../assets/input/promptfont.css"; // TODO: how compatible is this with modern bundlers?

import { useFrame } from "@react-three/fiber";
import {
    createContext,
    useContext,
    useEffect,
    useState,
    type Dispatch,
    type ReactNode,
    type SetStateAction, useMemo, useCallback
} from "react";

export type HintDevice = "kbm" | "xbox" | "playstation" | "switch";

// TODO: cancel throw action
export type HintAction = "move" | "jump" | "sprint" | "stop_sprinting" | "grab" | "release" | "throw_tap" | "throw_charge" | "charged_throw_execute" | "use" | "watch" | "free_cursor";

export type HintLayer = "default" | "verbose" | "not_sprinting" | "sprinting" | "not_holding" | "holding" | "holding_throwable" | "holding_useable" | "charging_throw";

export interface InputHint {
    glyphs: string[];
    label: string;
}

// TODO: sync with the actual input bindings, and make this configurable by the user
// TODO: I18N everywhere in this app!
const HINTS: Record<HintDevice, Record<HintAction, InputHint>> = {
    kbm: {
        move: { glyphs: ["keyboard-w", "keyboard-a", "keyboard-s", "keyboard-d"], label: "Move" },
        jump: { glyphs: ["keyboard-space"], label: "Jump" },
        sprint: { glyphs: ["button-hold-press", "keyboard-shift"], label: "Sprint" },
        stop_sprinting: { glyphs: ["button-hold-release", "keyboard-shift"], label: "Walk" }, // TODO: diefferentiate between hold and toggle sprinting
        grab: { glyphs: ["mouse-2"], label: "Grab" },
        release: { glyphs: ["button-hold-release", "mouse-2"], label: "Release" },
        throw_tap: { glyphs: ["keyboard-f"], label: "Throw (tap)" },
        throw_charge: { glyphs: ["button-hold-press", "keyboard-f"], label: "Throw (charge)" },
        charged_throw_execute: { glyphs: ["button-hold-release", "keyboard-f"], label: "Throw (release)" },
        use: { glyphs: ["mouse-button-1"], label: "Use" },
        watch: { glyphs: ["keyboard-tab"], label: "Watch" },
        free_cursor: { glyphs: ["keyboard-alt"], label: "Free cursor" },
    },

    // TODO: actually implement these bindings
    xbox: {
        move: { glyphs: ["stick-l"], label: "Move" },
        jump: { glyphs: ["button-a"], label: "Jump" },
        sprint: { glyphs: ["stick-l-press"], label: "Sprint" },
        stop_sprinting: { glyphs: ["stick-l-press"], label: "Walk" },
        grab: { glyphs: ["trigger-l"], label: "Grab" },
        release: { glyphs: ["button-hold-release", "trigger-l"], label: "Release" },
        throw_tap: { glyphs: ["button-y"], label: "Throw (tap)" },
        throw_charge: { glyphs: ["button-hold-press", "button-y"], label: "Throw (charge)" },
        charged_throw_execute: { glyphs: ["button-hold-release", "button-y"], label: "Throw (release)" },
        use: { glyphs: ["trigger-r"], label: "Use" },
        watch: { glyphs: ["xbox-menu"], label: "Watch" },
        free_cursor: { glyphs: ["xbox-view"], label: "Free cursor" }
    },
    playstation: {
        move: { glyphs: ["stick-l"], label: "Move" },
        jump: { glyphs: ["button-cross"], label: "Jump" },
        sprint: { glyphs: ["stick-l-press"], label: "Sprint" },
        stop_sprinting: { glyphs: ["stick-l-press"], label: "Walk" },
        grab: { glyphs: ["trigger-l2"], label: "Grab" },
        release: { glyphs: ["button-hold-release", "trigger-l2"], label: "Release" },
        throw_tap: { glyphs: ["button-triangle"], label: "Throw (tap)" },
        throw_charge: { glyphs: ["button-hold-press", "button-triangle"], label: "Throw (charge)" },
        charged_throw_execute: { glyphs: ["button-hold-release", "button-triangle"], label: "Throw (release)" },
        use: { glyphs: ["trigger-r2"], label: "Use" },
        watch: { glyphs: ["sony-options"], label: "Watch" },
        free_cursor: { glyphs: ["sony-share"], label: "Free cursor" }
    },
    switch: {
        move: { glyphs: ["stick-l"], label: "Move" },
        jump: { glyphs: ["button-b"], label: "Jump" }, // nintendo bottom face button
        sprint: { glyphs: ["stick-l-press"], label: "Sprint" },
        stop_sprinting: { glyphs: ["stick-l-press"], label: "Walk" },
        grab: { glyphs: ["trigger-zl"], label: "Grab" },
        release: { glyphs: ["button-hold-release", "trigger-zl"], label: "Release" },
        throw_tap: { glyphs: ["button-x"], label: "Throw (tap)" },
        throw_charge: { glyphs: ["button-hold-press", "button-x"], label: "Throw (charge)" },
        charged_throw_execute: { glyphs: ["button-hold-release", "button-x"], label: "Throw (release)" },
        use: { glyphs: ["trigger-zr"], label: "Use" },
        watch: { glyphs: ["button-plus"], label: "Watch" },
        free_cursor: { glyphs: ["button-minus"], label: "Free cursor" }
    }
};

const HINT_LAYERS: Record<HintLayer, HintAction[]> = {
    default: ["watch", "free_cursor"],
    verbose: ["move", "jump"],
    not_sprinting: ["sprint"],
    sprinting: ["stop_sprinting"],
    not_holding: ["grab"],
    holding: ["release"],
    holding_throwable: ["throw_tap", "throw_charge"],
    holding_useable: ["use"],
    charging_throw: ["charged_throw_execute"]
};


type HintSide = "left" | "right" | "both";

const HINT_LAYER_ORDER_LEFT: HintLayer[] = ["default", "verbose", "not_sprinting", "sprinting"];
const HINT_LAYER_ORDER_RIGHT: HintLayer[] = ["holding_useable", "not_holding", "holding", "holding_throwable", "charging_throw"];
const HINT_LAYER_OVERALL_ORDER: HintLayer[] = [...HINT_LAYER_ORDER_LEFT, ...HINT_LAYER_ORDER_RIGHT];

const HINT_SIDES: Record<HintSide, HintLayer[]> = {
    left: HINT_LAYER_ORDER_LEFT,
    right: HINT_LAYER_ORDER_RIGHT,
    both: HINT_LAYER_OVERALL_ORDER
};

const HINT_LAYER_SUPPRESSES: Partial<Record<HintLayer, HintLayer[]>> = {
    sprinting: ["not_sprinting"],
    holding: ["not_holding"],
    charging_throw: ["holding_throwable"]
};

export const compute_hint_actions_from_layers = (layers: HintLayer[], side_filter: HintSide = "both"): HintAction[] => {
    const side_order = HINT_SIDES[side_filter];

    const suppressed = new Set<HintLayer>();
    for (const layer of layers) {
        if (!side_order.includes(layer)) {
            suppressed.add(layer);
            continue;
        }

        for (const target of HINT_LAYER_SUPPRESSES[layer] ?? []) {
            suppressed.add(target);
        }
    }
    const visible_layers = layers.filter((layer) => !suppressed.has(layer));

    const actions = new Set<HintAction>();
    for (const layer of visible_layers) {
        const layer_actions = HINT_LAYERS[layer];
        for (const action of layer_actions) {
            actions.add(action);
        }
    }
    return Array.from(actions).sort((a, b) => {
        const a_index = side_order.findIndex((layer) => HINT_LAYERS[layer].includes(a));
        const b_index = side_order.findIndex((layer) => HINT_LAYERS[layer].includes(b));
        return a_index - b_index;
    });
};

export const HintGlyph = ({ action, merge_same_label = true, show_label = true, className = "", glyph_className = "" }: { action: HintAction; merge_same_label?: boolean, show_label?: boolean, className?: string, glyph_className?: string }) => {
    const {device} = useHintState();
    const hint = HINTS[device][action];

    return (
        <div aria-label={hint.label} className={className}>
            {hint.glyphs.map((glyph) => (
                <div key={glyph} className={glyph_className}>
                    <span className={`pf pf-${glyph}`} aria-hidden="true" />
                    {show_label && !merge_same_label && <span>{hint.label}</span>}
                </div>
            ))}

            {show_label && merge_same_label && <span>{hint.label}</span>}
        </div>
    );
};

export const AutoHintGlyphs = ({ side = "both", show_labels = true, merge_same_label = true, className = "", action_className = "", glyph_className = "" }: { side?: HintSide, show_labels?: boolean, merge_same_label?: boolean, className?: string, action_className?: string, glyph_className?: string }) => {
    const {layers} = useHintState();
    const actions = useMemo(() => compute_hint_actions_from_layers(layers, side), [layers, side]);

    return (
        <div className={className}>
            {actions.map((action) => (
                <HintGlyph key={action} action={action} merge_same_label={merge_same_label} show_label={show_labels} className={action_className} glyph_className={glyph_className} />
            ))}
        </div>
    );
}

export interface HintStateContextType {
    device: HintDevice;
    layers: HintLayer[];
}

const HintStateContext = createContext<HintStateContextType | null>(null);

interface SetHintStateContextType {
    set_device: Dispatch<SetStateAction<HintDevice>>;
    add_layer: (layer: HintLayer) => void;
    remove_layer: (layer: HintLayer, clear?: boolean) => void;
}

const SetHintStateContext = createContext<SetHintStateContextType | null>(null);

export const HintStateProvider = ({ children }: { children: ReactNode }) => {
    const [device, set_device] = useState<HintDevice>("kbm");
    const [layer_counts, set_layer_counts] = useState<Partial<Record<HintLayer, number>>>({
        default: 1,
        not_sprinting: 1
    });

    const add_layer = useCallback((layer: HintLayer) => {
        set_layer_counts((prev_counts) => ({
            ...prev_counts,
            [layer]: (prev_counts[layer] ?? 0) + 1
        }));
    }, []);

    const remove_layer = useCallback((layer: HintLayer, clear = false) => {
        set_layer_counts((prev_counts) => {
            const current = prev_counts[layer] ?? 0;
            if (current <= 0) {
                console.warn(`remove_layer("${layer}") without a matching add_layer`);
                return prev_counts;
            }
            return { ...prev_counts, [layer]: clear ? 0 : current - 1 };
        });
    }, []);

    const layers = useMemo(
        () =>
            (Object.keys(layer_counts) as HintLayer[]).filter(
                (layer) => (layer_counts[layer] ?? 0) > 0
            ),
        [layer_counts]
    );

    return (
        <HintStateContext.Provider value={{ device, layers }}>
            <SetHintStateContext.Provider value={{ set_device, add_layer, remove_layer }}>
                {children}
            </SetHintStateContext.Provider>
        </HintStateContext.Provider>
    );
};

export const useHintState = () => {
    const state = useContext(HintStateContext);
    if (state === null) throw new Error("useHintState must be used within a HintStateProvider");
    return state;
};

export const useSetHintState = () => {
    const setters = useContext(SetHintStateContext);
    if (setters === null) throw new Error("useSetHintState must be used within a HintStateProvider");
    return setters;
};

const detect_gamepad_device = (gamepad_id: string): HintDevice => {
    const id_lower = gamepad_id.toLowerCase();
    if (id_lower.includes("054c") || id_lower.includes("dualsense") || id_lower.includes("dualshock")) {
        return "playstation";
    }
    if (id_lower.includes("057e") || id_lower.includes("nintendo") || id_lower.includes("joy-con")) {
        return "switch";
    }

    // gamepad "standard" mapping is defined in xbox terms, sane default
    return "xbox";
};

const GAMEPAD_ACTIVITY_THRESHOLD = 0.25; // ignore stick drift

export const HintDevicePublisher = () => {
    const {set_device} = useSetHintState();

    useEffect(() => {
        const on_kbm_activity = () => set_device("kbm");
        window.addEventListener("keydown", on_kbm_activity);
        window.addEventListener("mousedown", on_kbm_activity);
        return () => {
            window.removeEventListener("keydown", on_kbm_activity);
            window.removeEventListener("mousedown", on_kbm_activity);
        };
    }, [set_device]);

    useFrame(() => {
        for (const gamepad of navigator.getGamepads()) {
            if (!gamepad) continue;

            const button_active = gamepad.buttons.some((button) => button.pressed);
            const axis_active = gamepad.axes.some(
                (axis_value) => Math.abs(axis_value) > GAMEPAD_ACTIVITY_THRESHOLD
            );

            if (button_active || axis_active) {
                set_device(detect_gamepad_device(gamepad.id));
                return;
            }
        }
    });

    return null;
};
