export type SettingValueType = Exclude<any, null>;

export type NumberWidget =
    | { type: "number"; min?: number; max?: number }
    | {
          type: "range";
          min: number;
          max: number;
          slider_min?: number;
          slider_max?: number;
          slider_step?: number;
          precision_dp?: number;
          unit?: string;
      };

export type BooleanWidget = { type: "checkbox" } | { type: "switch" };

export type StringWidget<V extends string> =
    | {
          type: "text";
          placeholder?: string;
          max_length?: number;
          subtype_hint?: "url" | "email" | "password"; // note: best effort only
          validation_regex?: RegExp;
      }
    | { type: "color" }
    | { type: "select"; options: Array<{ label: string; value: V }> };

export type ArrayWidget<V> =
    | { type: "list" }
    | { type: "tags"; max_tags?: number };

export type WidgetConfig<V> = V extends number
    ? NumberWidget
    : V extends boolean
      ? BooleanWidget
      : V extends string
        ? StringWidget<V>
        : V extends any[]
          ? ArrayWidget<V>
          : { type: "unsupported" };

export type WidgetType<V> = WidgetConfig<V>["type"];

export type WidgetArguments<T extends WidgetType<any>> = Omit<
    Extract<WidgetConfig<any>, { type: T }>,
    "type"
>;

export interface UISubdefinition<V> {
    label: string;
    description?: string;
    breadcrumbs?: string[]; // if omitted, component must be added manually to the UI, but will inherit all its existing widget definitions
    widget: WidgetConfig<V>;
}

export interface SeparateUIDefinition<V extends SettingValueType> {
    // if either omitted, then will have no associated widget and must be implemented manually on the specific platform

    flat?: UISubdefinition<V>;
    watch?: UISubdefinition<V>;
}

export interface CommonUIDefinition<V extends SettingValueType> {
    common: UISubdefinition<V>;
}

type UIDefinition<V extends SettingValueType> =
    | CommonUIDefinition<V>
    | SeparateUIDefinition<V>;

// value cannot be nullable, as null is used by storage engines to indicate a key is deleted
export interface Setting<V extends SettingValueType> {
    key: string;
    default_value: V;
    local_only?: boolean; // default false, if true, setting will not be placed into sync storage. note that changing this will make the setting value reset as a different storage engine is used
    ui?: UIDefinition<V>; // if omitted, the setting will have no associated widget and must be implemented manually
}

const build_settings = <T extends Record<string, Omit<Setting<any>, "key">>>(
    settings: T
): { [K in keyof T]: Setting<T[K]["default_value"]> } => {
    const result = {} as any;
    for (const [key, setting] of Object.entries(settings)) {
        result[key] = {
            key,
            ...setting
        };
    }
    return result;
};

export const settings_def = build_settings({
    watch_hand: {
        default_value: "left" as "left" | "right",
        ui: {
            common: {
                label: "Watch hand",
                description: "Which hand to wear the wristwatch on",
                widget: {
                    type: "select",
                    options: [
                        { label: "Left", value: "left" },
                        { label: "Right", value: "right" }
                    ]
                },
                include_in_popup: true,
                breadcrumbs: ["General", "Player"]
            }
        }
    },

    use_debug_input: {
        default_value: false,
        local_only: true,
        ui: {
            flat: {
                label: "Use raw input",
                description:
                    "The default method of dispatching input events to the tab may cause some sites to ignore it.\nEnable this option to use Chrome's debugger to inject raw inputs directly.",
                widget: {
                    type: "switch"
                },
                include_in_popup: true,
                breadcrumbs: ["Input"]
            }
        }
    },

    spectator_view: {
        default_value: "first_person" as
            | "first_person"
            | "third_person"
            | "mixed_reality",
        ui: {
            common: {
                label: "Spectator view",
                description: "How the spectator view is displayed",
                widget: {
                    type: "select",
                    options: [
                        { label: "First Person", value: "first_person" },
                        { label: "Third Person", value: "third_person" },
                        { label: "Mixed Reality", value: "mixed_reality" }
                    ]
                },
                include_in_popup: true,
                breadcrumbs: ["General", "Spectator Camera"]
            }
        }
    },

    third_person_fov: {
        default_value: 60,
        ui: {
            common: {
                label: "Third person FOV",
                description:
                    "Field of view for the third person spectator camera",
                widget: {
                    type: "range",
                    min: 1,
                    max: 120,
                    slider_min: 30,
                    slider_max: 90,
                    slider_step: 0.1,
                    precision_dp: 2,
                    unit: "°"
                },
                include_in_popup: true,
                breadcrumbs: ["General", "Spectator Camera"]
            }
        }
    },

    player_height_cm: {
        default_value: 170,
        ui: {
            common: {
                label: "Player height",
                description: "Height of the player in centimeters",
                widget: {
                    type: "range",
                    min: 100,
                    max: 225,
                    precision_dp: 1,
                    unit: "cm"
                },
                include_in_popup: true,
                breadcrumbs: ["General", "Player"]
            }
        }
    },

    debug_ray_hits: {
        default_value: false,
        local_only: true
    },

    debug_clicks: {
        default_value: false,
        local_only: true
    },

    debug_touch: {
        default_value: false,
        local_only: true
    },

    debug_lights: {
        default_value: false,
        local_only: true
    },

    debug_colliders: {
        default_value: false,
        local_only: true
    },

    debug_groups: {
        default_value: false,
        local_only: true
    },

    debug_show_expression_ui: {
        default_value: false,
        local_only: true
    },

    debug_rerenders: {
        default_value: false,
        local_only: true
    }
});

export type SettingKey = keyof typeof settings_def;

export type SettingKeyReturning<V extends Exclude<any, null>> = {
    [K in SettingKey]: (typeof settings_def)[K]["default_value"] extends V
        ? K
        : never;
}[SettingKey];


export interface SettingsTree {
    subtrees: Record<string, SettingsTree>;
    settings: Setting<any>[];
}
