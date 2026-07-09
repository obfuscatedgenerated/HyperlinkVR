import {BaseBuilder} from "./base";
import {
    Collider,
    ColliderSchema,
    CustomMeshApproximation,
    MeshApproximation,
    PhysicsSystem,
    PhysicsSystemInput,
    PhysicsSystemSchema,
    RigidBody,
    RigidBodyInput,
    RigidBodySchema,
    RigidBodyType
} from "@hyperlinkvr/vr-engine-schemas";

export class PhysicsSystemBuilder extends BaseBuilder<PhysicsSystemInput> {
    constructor() {
        super({});
    }

    set_rigid_body(body: RigidBody) {
        this._internal.rigid_body = body;
        return this;
    }

    // when report_motion/collisions supported then add here

    build(): PhysicsSystem {
        return PhysicsSystemSchema.parse(this._internal);
    }
}

class RigidBodyBuilder extends BaseBuilder<RigidBodyInput> {
    constructor(type: RigidBodyType) {
        super({type} as RigidBodyInput);
    }

    set_collider(collider: Collider) {
        this._internal.collider = collider;
        return this;
    }

    protected _try_set_mass(mass: number) {
        if (this._internal.type !== "dynamic") {
            throw new Error("Mass can only be set for dynamic rigid bodies.");
        }

        this._internal.mass = mass;
        return this;
    }

    protected _try_set_velocity(velocity: [number, number, number]) {
        if (
            this._internal.type !== "dynamic" &&
            this._internal.type !== "kinematic-vel"
        ) {
            throw new Error(
                "Velocity can only be set for dynamic or kinematic-vel rigid bodies."
            );
        }

        this._internal.velocity = velocity;
        return this;
    }

    build(): RigidBody {
        return RigidBodySchema.parse(this._internal);
    }
}

export class DynamicRigidBodyBuilder extends RigidBodyBuilder {
    constructor() {
        super("dynamic");
    }

    set_mass(mass: number) {
        return this._try_set_mass(mass);
    }

    set_velocity(velocity: [number, number, number]) {
        return this._try_set_velocity(velocity);
    }
}

export class KinematicPosRigidBodyBuilder extends RigidBodyBuilder {
    constructor() {
        super("kinematic-pos");
    }
}

export class KinematicVelRigidBodyBuilder extends RigidBodyBuilder {
    constructor() {
        super("kinematic-vel");
    }

    set_velocity(velocity: [number, number, number]) {
        return this._try_set_velocity(velocity);
    }
}

export class FixedRigidBodyBuilder extends RigidBodyBuilder {
    constructor() {
        super("fixed");
    }
}

export class ColliderBuilder extends BaseBuilder<Collider> {
    constructor() {
        super({type: "auto"});
    }

    box(size: [number, number, number]) {
        this._internal = {type: "box", size};
        return this;
    }

    sphere(radius: number) {
        this._internal = {type: "sphere", radius};
        return this;
    }

    capsule(radius: number, height: number) {
        this._internal = {type: "capsule", radius, height};
        return this;
    }

    custom_mesh(mesh_url: string, approximation?: CustomMeshApproximation) {
        this._internal = {type: "custom-mesh", mesh: mesh_url, approximation};
        return this;
    }

    auto(approximation?: MeshApproximation) {
        this._internal = {type: "auto", approximation};
        return this;
    }

    build(): Collider {
        return ColliderSchema.parse(this._internal);
    }
}
