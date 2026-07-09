import {BaseBuilder} from "./base";
import {AxesBasedMonitorInput, AxisRange, Monitor, MonitorSchema} from "@hyperlinkvr/vr-engine-schemas";

class AxesBasedMonitorBuilder extends BaseBuilder<AxesBasedMonitorInput> {
    constructor(type: "position" | "rotation" | "linear-velocity" | "angular-velocity",) {
        super({type});
    }

    when(cond: "any" | "all" | "xor") {
        this._internal.when = cond;
        return this;
    }

    x(range: AxisRange) {
        this._internal.x = range;
        return this;
    }

    y(range: AxisRange) {
        this._internal.y = range;
        return this;
    }

    z(range: AxisRange) {
        this._internal.z = range;
        return this;
    }

    build(): Monitor {
        return MonitorSchema.parse(this._internal);
    }
}

export class PositionMonitorBuilder extends AxesBasedMonitorBuilder {
    constructor() {
        super("position");
    }
}

export class RotationMonitorBuilder extends AxesBasedMonitorBuilder {
    constructor() {
        super("rotation");
    }
}

export class LinearVelocityMonitorBuilder extends AxesBasedMonitorBuilder {
    constructor() {
        super("linear-velocity");
    }
}

export class AngularVelocityMonitorBuilder extends AxesBasedMonitorBuilder {
    constructor() {
        super("angular-velocity");
    }
}
