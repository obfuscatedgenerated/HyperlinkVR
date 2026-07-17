import {BaseBuilder} from "./base";
import {
    BasketballHoopPrefab,
    BasketballHoopPrefabInput, BasketballHoopPrefabSchema,
    ButtonPrefab,
    ButtonPrefabInput,
    ButtonPrefabSchema,
    HexNumericalColor,
    HexNumericalColorSchema,
    StandardPrefab, StandardPrefabInput, StandardPrefabName,
    StandardPrefabSchema
} from "@hyperlinkvr/vr-engine-schemas";

export class ButtonPrefabBuilder extends BaseBuilder<ButtonPrefabInput> {
    constructor() {
        super({type: "prefab", name: "button"} as ButtonPrefabInput);
    }

    named(name: string) {
        this._internal.binding = {...this._internal.binding, name};
        return this;
    }

    set_label(label: string) {
        this._internal.label = label;
        return this;
    }

    set_color(color: HexNumericalColor) {
        this._internal.color = HexNumericalColorSchema.parse(color);
        return this;
    }

    set_reports_press(reports: boolean) {
        this._internal.report_press = reports;
        return this;
    }

    set_reports_release(reports: boolean) {
        this._internal.report_release = reports;
        return this;
    }

    build(): ButtonPrefab {
        return ButtonPrefabSchema.parse(this._internal);
    }
}

export class BasketballHoopPrefabBuilder extends BaseBuilder<BasketballHoopPrefabInput> {
    constructor() {
        super({type: "prefab", name: "basketball_hoop"} as BasketballHoopPrefabInput);
    }

    named(name: string) {
        this._internal.binding = {...this._internal.binding, name};
        return this;
    }

    set_enable_sfx(enable: boolean) {
        this._internal.enable_sfx = enable;
        return this;
    }

    set_enable_particles(enable: boolean) {
        this._internal.enable_particles = enable;
        return this;
    }

    build(): BasketballHoopPrefab {
        return BasketballHoopPrefabSchema.parse(this._internal);
    }
}

export class StandardPrefabBuilder extends BaseBuilder<StandardPrefabInput> {
    constructor(name: StandardPrefabName) {
        super({type: "prefab", name} as StandardPrefabInput);
    }

    build(): StandardPrefab {
        return StandardPrefabSchema.parse(this._internal);
    }
}
