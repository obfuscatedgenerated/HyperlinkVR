import { z } from "zod";

export const Vector3Schema = z.tuple([z.number(), z.number(), z.number()]);
export type Vector3 = z.infer<typeof Vector3Schema>;

export const Vector4Schema = z.tuple([z.number(), z.number(), z.number(), z.number()]);
export type Vector4 = z.infer<typeof Vector4Schema>;

export const EulerRotationSchema = z.tuple([
    z.number(),
    z.number(),
    z.number()
]);
export type EulerRotation = z.infer<typeof EulerRotationSchema>;

export const QuaternionRotationSchema = z.tuple([
    z.number(),
    z.number(),
    z.number(),
    z.number()
]);
export type QuaternionRotation = z.infer<typeof QuaternionRotationSchema>;

export const RotationSchema = z.union([
    EulerRotationSchema,
    QuaternionRotationSchema
]);
export type Rotation = z.infer<typeof RotationSchema>;

export const TransformSchema = z.object({
    position: Vector3Schema.default([0, 0, 0]),
    rotation: RotationSchema.default([0, 0, 0]),
    scale: Vector3Schema.default([1, 1, 1])
});
export type Transform = z.infer<typeof TransformSchema>;
export type TransformInput = z.input<typeof TransformSchema>;


export const BindingConfigSchema = z.object({
    id: z.string().optional(),   // routing id, minted at dispatch
    name: z.string().optional()  // author label, used to bind callbacks
});
export type BindingConfig = z.infer<typeof BindingConfigSchema>;
const bindable = <T extends z.ZodRawShape>(shape: T) =>
    z.object({ ...shape, binding: BindingConfigSchema.optional() });

export type Bindable<T extends z.ZodRawShape = any> = z.infer<ReturnType<typeof bindable<T>>> & {binding?: BindingConfig};

// TODO: collider combo?

const BaseColliderSchema = z.object({
    type: z.string(),
    offset: Vector3Schema.optional(),
    rotation: RotationSchema.optional()
});

export const BoxColliderSchema = BaseColliderSchema.extend({
    type: z.literal("box"),
    size: z.tuple([z.number(), z.number(), z.number()])
});
export type BoxCollider = z.infer<typeof BoxColliderSchema>;

export const SphereColliderSchema = BaseColliderSchema.extend({
    type: z.literal("sphere"),
    radius: z.number().positive()
});
export type SphereCollider = z.infer<typeof SphereColliderSchema>;

export const CapsuleColliderSchema = BaseColliderSchema.extend({
    type: z.literal("capsule"),
    radius: z.number().positive(),
    height: z.number().positive()
});
export type CapsuleCollider = z.infer<typeof CapsuleColliderSchema>;

export const CylinderColliderSchema = BaseColliderSchema.extend({
    type: z.literal("cylinder"),
    radius: z.number().positive(),
    height: z.number().positive()
});
export type CylinderCollider = z.infer<typeof CylinderColliderSchema>;

export const CustomMeshApproximationSchema = z.enum(["hull", "trimesh"]).default("hull");
export type CustomMeshApproximation = z.infer<typeof CustomMeshApproximationSchema>;

export const CustomMeshColliderSchema = BaseColliderSchema.extend({
    type: z.literal("custom-mesh"),
    mesh: z.url({
        protocol: /^https?$/,
        hostname: z.regexes.domain
    }),
    approximation: CustomMeshApproximationSchema.optional()
});
export type CustomMeshCollider = z.infer<typeof CustomMeshColliderSchema>;

export const MeshApproximationSchema = z
    .enum(["hull", "trimesh", "cuboid", "ball"])
    .default("hull");
export type MeshApproximation = z.infer<typeof MeshApproximationSchema>;

export const AutoColliderSchema = BaseColliderSchema.extend({
    type: z.literal("auto"),
    approximation: MeshApproximationSchema.optional()
});
export type AutoCollider = z.infer<
    typeof AutoColliderSchema
>;

export const ColliderSchema = z.discriminatedUnion("type", [
    BoxColliderSchema,
    SphereColliderSchema,
    CapsuleColliderSchema,
    CylinderColliderSchema,
    CustomMeshColliderSchema,
    AutoColliderSchema
]);
export type Collider = z.infer<typeof ColliderSchema>;

const AxisLockSchema = z.object({
    x: z.boolean().default(false),
    y: z.boolean().default(false),
    z: z.boolean().default(false)
});
export type AxisLock = z.infer<typeof AxisLockSchema>;
export type AxisLockInput = z.input<typeof AxisLockSchema>;

const LockedAxesSchema = z.object({
    rotation: AxisLockSchema,
    translation: AxisLockSchema
});
export type LockedAxes = z.infer<typeof LockedAxesSchema>;
export type LockedAxesInput = z.input<typeof LockedAxesSchema>;

const BaseRigidBodySchema = z.object({
    restitution: z.number().optional(),
    restitution_combine_rule: z.enum(["average", "min", "max", "multiply"]).default("average").optional(),
    friction: z.number().optional(),
    linear_damping: z.number().optional(),
    angular_damping: z.number().optional(),
    collider: ColliderSchema.optional()
});

export const FixedRigidBodySchema = BaseRigidBodySchema.extend({
    type: z.literal("fixed")
});
export type FixedRigidBody = z.infer<typeof FixedRigidBodySchema>;
export type FixedRigidBodyInput = z.input<typeof FixedRigidBodySchema>;

export const DynamicRigidBodySchema = BaseRigidBodySchema.extend({
    type: z.literal("dynamic"),
    mass: z.number().positive(),
    gravity_scale: z.number().optional(),
    ccd: z.boolean().optional(),
    velocity: Vector3Schema.optional(),
    angular_velocity: Vector3Schema.optional(),
    locked_axes: LockedAxesSchema.optional()
});
export type DynamicRigidBody = z.infer<typeof DynamicRigidBodySchema>;
export type DynamicRigidBodyInput = z.input<typeof DynamicRigidBodySchema>;

export const KinematicPositionRigidBodySchema = BaseRigidBodySchema.extend({
    type: z.literal("kinematic-pos")
});
export type KinematicPositionRigidBody = z.infer<typeof KinematicPositionRigidBodySchema>;
export type KinematicPositionRigidBodyInput = z.input<typeof KinematicPositionRigidBodySchema>;

export const KinematicVelocityRigidBodySchema = BaseRigidBodySchema.extend({
    type: z.literal("kinematic-vel"),
    velocity: Vector3Schema,
    angular_velocity: Vector3Schema.optional()
});
export type KinematicVelocityRigidBody = z.infer<typeof KinematicVelocityRigidBodySchema>;
export type KinematicVelocityRigidBodyInput = z.input<typeof KinematicVelocityRigidBodySchema>;

export const RigidBodySchema = z.discriminatedUnion("type", [
    FixedRigidBodySchema,
    DynamicRigidBodySchema,
    KinematicPositionRigidBodySchema,
    KinematicVelocityRigidBodySchema
]);
export type RigidBody = z.infer<typeof RigidBodySchema>;
export type RigidBodyInput = z.input<typeof RigidBodySchema>;
export type RigidBodyType = RigidBody["type"];

export const PhysicsSystemSchema = bindable({
    rigid_body: RigidBodySchema.optional(),
    //joints: // to be added later
    report_collisions: z.boolean().default(false).optional(),
    // report_motion: z.boolean().default(false)
});
export type PhysicsSystem = z.infer<typeof PhysicsSystemSchema>;
export type PhysicsSystemInput = z.input<typeof PhysicsSystemSchema>;

export const GrabOffsetSchema = z.object({
    position: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
    rotation: RotationSchema.default([0, 0, 0])
});
export type GrabOffset = z.infer<typeof GrabOffsetSchema>;
export type GrabOffsetInput = z.input<typeof GrabOffsetSchema>;

export const AutoBoundingBoxColliderSchema = z.object({
    type: z.literal("auto-bounding-box")
});
export type AutoBoundingBoxCollider = z.infer<
    typeof AutoBoundingBoxColliderSchema
>;

export const AutoBoundingSphereColliderSchema = z.object({
    type: z.literal("auto-bounding-sphere")
});
export type AutoBoundingSphereCollider = z.infer<
    typeof AutoBoundingSphereColliderSchema
>;

export const GrabColliderSchema = z.discriminatedUnion("type", [
    AutoBoundingBoxColliderSchema,
    AutoBoundingSphereColliderSchema,
    BoxColliderSchema,
    SphereColliderSchema,
    CapsuleColliderSchema
]);
export type GrabCollider = z.infer<typeof GrabColliderSchema>;


export const GrabbableInteractionSchema = bindable({
    type: z.literal("grabbable"),
    collider: GrabColliderSchema.default({ type: "auto-bounding-box" }),
    grab_distance: z.number().positive().optional(),
    grab_offset: GrabOffsetSchema.optional(),
    sticky: z.boolean().default(true),
    snaps_to_hand: z.boolean().default(true),
    report_grabs: z.boolean().default(false),
    report_releases: z.boolean().default(false),
    report_proximity: z.boolean().default(false),
    flat_throwable: z.boolean().default(true), // false only prevents using the throw button on flat mode (ui hint). we cant stop vr players throwing. use max_throw_speed = 0 to make it slip out their hand instead
    min_flat_throw_speed: z.number().nonnegative().optional(), // the speed of the minimum throw on flat (tapping the throw key)
    max_throw_speed: z.number().nonnegative().optional(), // the maximum throw speed on flat and vr. note that an additional headroom of 1.2x is applied so that locomotion can add to the speed
});
export type GrabbableInteraction = z.infer<typeof GrabbableInteractionSchema>;
export type GrabbableInteractionInput = z.input<typeof GrabbableInteractionSchema>;

export const ControllerButtonWhenListenSchema = z.union([
    z.literal("held"),
    z.literal("nearby"),
    z.literal("intersecting"),
    z.literal("always")
]);
export type ControllerButtonWhenListen = z.infer<
    typeof ControllerButtonWhenListenSchema
>;

export const ControllerButtonInteractionSchema = bindable({
    type: z.literal("controller-button"),
    button: z.string(),
    report_press: z.boolean().default(true),
    report_release: z.boolean().default(true),
    when_listen: ControllerButtonWhenListenSchema.default("held")
});
export type ControllerButtonInteraction = z.infer<
    typeof ControllerButtonInteractionSchema
>;
export type ControllerButtonInteractionInput = z.input<
    typeof ControllerButtonInteractionSchema
>;

const TriggerVolumeObjectsDisableSchema = z.object({
    include: z.literal(false)
});
const TriggerVolumeObjectsEnableSchema = z.object({
    include: z.literal(true),
    tag_filter: z.array(z.string()).optional()
});
const TriggerVolumeObjectsSchema = z.union([
    TriggerVolumeObjectsDisableSchema,
    TriggerVolumeObjectsEnableSchema
]);

export const TriggerVolumeInteractionSchema = bindable({
    type: z.literal("trigger-volume"),
    collider: ColliderSchema,
    report_enter: z.boolean().default(true),
    report_exit: z.boolean().default(true),
    ignore_hands: z.boolean().default(false),
    ignore_torso: z.boolean().default(false),
    ignore_head: z.boolean().default(false),
    objects: TriggerVolumeObjectsSchema.default({ include: false })
});
export type TriggerVolumeInteraction = z.infer<
    typeof TriggerVolumeInteractionSchema
>;
export type TriggerVolumeInteractionInput = z.input<
    typeof TriggerVolumeInteractionSchema
>;

export const FollowPlayerInteractionSchema = bindable({
    type: z.literal("follow-player"),
    enabled: z.boolean().default(true),
    snap_on_release: z.boolean().default(false) // if true, disabling follow will make the object obey its position coordinates rather than freezing in place. likely irrelevant for most implementations
});
export type FollowPlayerInteraction = z.infer<typeof FollowPlayerInteractionSchema>;
export type FollowPlayerInteractionInput = z.input<typeof FollowPlayerInteractionSchema>;

export const PositionalAudioInteractionSchema = bindable({
    type: z.literal("positional-audio"),
    url: z.url({
        protocol: /^https?$/,
        hostname: z.regexes.domain
    }),
    max_distance: z.number().positive().default(10),
    loop: z.boolean().default(false),
    autoplay: z.boolean().default(false),
    offset: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
});
export type PositionalAudioInteraction = z.infer<typeof PositionalAudioInteractionSchema>;
export type PositionalAudioInteractionInput = z.input<typeof PositionalAudioInteractionSchema>

export const GlobalAudioInteractionSchema = bindable({
    type: z.literal("global-audio"),
    url: z.url({
        protocol: /^https?$/,
        hostname: z.regexes.domain
    }),
    loop: z.boolean().default(false),
    autoplay: z.boolean().default(false),
    volume: z.number().min(0).max(1).default(1)
});
export type GlobalAudioInteraction = z.infer<typeof GlobalAudioInteractionSchema>;
export type GlobalAudioInteractionInput = z.input<typeof GlobalAudioInteractionSchema>

export const HexNumericalColorSchema = z.number().int().min(0).max(0xffffff);
export type HexNumericalColor = z.infer<typeof HexNumericalColorSchema>;

export const HexStringColorSchema = z.string().regex(/^#([0-9a-fA-F]{6})$/);
export type HexStringColor = z.infer<typeof HexStringColorSchema>;

export const HexColorSchema = z.union([HexNumericalColorSchema, HexStringColorSchema]);
export type HexColor = z.infer<typeof HexColorSchema>;

export const PointLightInteractionSchema = bindable({
    type: z.literal("point-light"),
    color: HexColorSchema.default(0xffffff),
    intensity: z.number().nonnegative().default(1),
    distance: z.number().nonnegative().default(0),
    decay: z.number().nonnegative().default(2),
    offset: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
});
export type PointLightInteraction = z.infer<typeof PointLightInteractionSchema>;
export type PointLightInteractionInput = z.input<typeof PointLightInteractionSchema>;

export const SpotLightInteractionSchema = bindable({
    type: z.literal("spot-light"),
    color: HexColorSchema.default(0xffffff),
    intensity: z.number().nonnegative().default(1),
    distance: z.number().nonnegative().default(0),
    decay: z.number().nonnegative().default(2),
    angle: z.number().min(0).max(Math.PI / 2).default(Math.PI / 3),
    penumbra: z.number().min(0).max(1).default(0),
    offset: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
    rotation: RotationSchema.default([0, 0, 0]),
});
export type SpotLightInteraction = z.infer<typeof SpotLightInteractionSchema>;
export type SpotLightInteractionInput = z.input<typeof SpotLightInteractionSchema>;

export const DirectionalLightInteractionSchema = bindable({
    type: z.literal("directional-light"),
    color: HexColorSchema.default(0xffffff),
    intensity: z.number().nonnegative().default(1),
    offset: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
    rotation: RotationSchema.default([0, 0, 0]),
});
export type DirectionalLightInteraction = z.infer<typeof DirectionalLightInteractionSchema>;
export type DirectionalLightInteractionInput = z.input<typeof DirectionalLightInteractionSchema>;

export const InteractionSchema = z.discriminatedUnion("type", [
    GrabbableInteractionSchema,
    ControllerButtonInteractionSchema,
    TriggerVolumeInteractionSchema,
    FollowPlayerInteractionSchema,
    PositionalAudioInteractionSchema,
    GlobalAudioInteractionSchema,
    PointLightInteractionSchema,
    SpotLightInteractionSchema,
    DirectionalLightInteractionSchema
]);
export type Interaction = z.infer<typeof InteractionSchema>;
export type InteractionInput = z.input<typeof InteractionSchema>;

// export const MaterialAlbedoColorSchema = z.object({
//     type: z.literal("color"),
//     color: z.string()
// });
// export type MaterialAlbedoColor = z.infer<typeof MaterialAlbedoColorSchema>;

// export const MaterialAlbedoTextureSchema = z.object({
//     type: z.literal("texture"),
//     texture: z.string()
// });
// export type MaterialAlbedoTexture = z.infer<typeof MaterialAlbedoTextureSchema>;
//
// export const MaterialAlbedoSchema = z.discriminatedUnion("type", [
//     MaterialAlbedoColorSchema,
//     MaterialAlbedoTextureSchema
// ]);
// export type MaterialAlbedo = z.infer<typeof MaterialAlbedoSchema>;
// TODO: material override definition that takes value or texture for pbr fields. for now their mesh should include embedded material

export const CustomObjectSchema = z.object({
    type: z.literal("custom"),
    mesh: z
        .url({
            protocol: /^https?$/,
            hostname: z.regexes.domain
        })
        .optional(),
    // material_override: MaterialSchema.optional(),
    physics: PhysicsSystemSchema.optional(),
    interactions: z.array(InteractionSchema).optional()
});
export type CustomObject = z.infer<typeof CustomObjectSchema>;
export type CustomObjectInput = z.input<typeof CustomObjectSchema>;

// TODO: built in primitive meshes, either by a path or explicit in schema. would be useless without material override tho

// prefabs without special behaviour, we just need to tell zod the name
const StandardPrefabName = z.enum(["basketball"]);
export type StandardPrefabName = z.infer<typeof StandardPrefabName>;

export const StandardPrefabSchema = z.object({
    type: z.literal("prefab"),
    name: StandardPrefabName
});
export type StandardPrefab = z.infer<typeof StandardPrefabSchema>;
export type StandardPrefabInput = z.input<typeof StandardPrefabSchema>;

export const ButtonPrefabSchema = bindable({
    type: z.literal("prefab"),
    name: z.literal("button"),
    label: z.string(),
    color: HexColorSchema.default(0x00ff00),
    report_press: z.boolean().default(true),
    report_release: z.boolean().default(true)
});
export type ButtonPrefab = z.infer<typeof ButtonPrefabSchema>;
export type ButtonPrefabInput = z.input<typeof ButtonPrefabSchema>;

export const BasketballHoopPrefabSchema = bindable({
    type: z.literal("prefab"),
    name: z.literal("basketball_hoop"),
    enable_sfx: z.boolean().default(true),
});
export type BasketballHoopPrefab = z.infer<typeof BasketballHoopPrefabSchema>;
export type BasketballHoopPrefabInput = z.input<typeof BasketballHoopPrefabSchema>;

export const PrefabSchema = z.discriminatedUnion("name", [StandardPrefabSchema, ButtonPrefabSchema, BasketballHoopPrefabSchema]);
export type Prefab = z.infer<typeof PrefabSchema>;
export type PrefabInput = z.input<typeof PrefabSchema>;

export const EngineObjectSchema = z.union([CustomObjectSchema, PrefabSchema]);
export type EngineObject = z.infer<typeof EngineObjectSchema>;
export type EngineObjectInput = z.input<typeof EngineObjectSchema>;

export const AxisRangeSchema = z.union([
    z.object({
        min: z.number(),
        max: z.number()
    }),
    z.object({
        min: z.number(),
    }),
    z.object({
        max: z.number(),
    }),
    z.object({
        equals: z.number()
    })
]);
export type AxisRange = z.infer<typeof AxisRangeSchema>;

export const AxesBasedMonitorSchema = bindable({
    type: z.enum(["position", "rotation", "linear-velocity", "angular-velocity"]),
    when: z.enum(["any", "all", "xor"]).default("all"),
    x: AxisRangeSchema.optional(),
    y: AxisRangeSchema.optional(),
    z: AxisRangeSchema.optional()
});
export type AxesBasedMonitor = z.infer<typeof AxesBasedMonitorSchema>;
export type AxesBasedMonitorInput = z.input<typeof AxesBasedMonitorSchema>;

export const PositionMonitorSchema = AxesBasedMonitorSchema.extend({
    type: z.literal("position"),
});
export type PositionMonitor = z.infer<typeof PositionMonitorSchema>;
export type PositionMonitorInput = z.input<typeof PositionMonitorSchema>;

export const RotationMonitorSchema = AxesBasedMonitorSchema.extend({
    type: z.literal("rotation"),
});
export type RotationMonitor = z.infer<typeof RotationMonitorSchema>;
export type RotationMonitorInput = z.input<typeof RotationMonitorSchema>;

export const LinearVelocityMonitorSchema = AxesBasedMonitorSchema.extend({
    type: z.literal("linear-velocity"),
});
export type LinearVelocityMonitor = z.infer<typeof LinearVelocityMonitorSchema>;
export type LinearVelocityMonitorInput = z.input<typeof LinearVelocityMonitorSchema>;

export const AngularVelocityMonitorSchema = AxesBasedMonitorSchema.extend({
    type: z.literal("angular-velocity"),
});
export type AngularVelocityMonitor = z.infer<typeof AngularVelocityMonitorSchema>;
export type AngularVelocityMonitorInput = z.input<typeof AngularVelocityMonitorSchema>;

export const MonitorSchema = z.discriminatedUnion("type", [
    PositionMonitorSchema,
    RotationMonitorSchema,
    LinearVelocityMonitorSchema,
    AngularVelocityMonitorSchema
]);
export type Monitor = z.infer<typeof MonitorSchema>;
export type MonitorInput = z.input<typeof MonitorSchema>;

export const EngineObjectDispatchSchema = z.object({
    object: EngineObjectSchema,
    transform: TransformSchema.default({
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1]
    }),
    user_data: z.record(z.string(), z.any()).optional(),
    monitors: z.array(MonitorSchema).optional(),
    tags: z.array(z.string()).optional()
});
export type EngineObjectDispatch = z.infer<typeof EngineObjectDispatchSchema>;
export type EngineObjectDispatchInput = z.input<typeof EngineObjectDispatchSchema>;

export const CreatedEngineObjectSchema = EngineObjectDispatchSchema.extend({
    id: z.string(),
    transform: TransformSchema // transform is guaranteed to be resolved now
});

export type CreatedEngineObject = z.infer<typeof CreatedEngineObjectSchema>;
export type CreatedEngineObjectInput = z.input<typeof CreatedEngineObjectSchema>;

export const PartialTransformSchema = z.object({
    position: z.tuple([z.number(), z.number(), z.number()]).optional(),
    rotation: RotationSchema.optional(),
    scale: z.tuple([z.number(), z.number(), z.number()]).optional()
});
export type PartialTransform = z.infer<typeof PartialTransformSchema>;
export type PartialTransformInput = z.input<typeof PartialTransformSchema>;

export const EngineObjectModificationSchema = z.object({
    id: z.string(),
    transform: PartialTransformSchema.optional(),
    user_data: z.record(z.string(), z.any()).optional(),
    monitors: z.array(MonitorSchema).optional(),
    tags: z.array(z.string()).optional()
});
export type EngineObjectModification = z.infer<typeof EngineObjectModificationSchema>;
export type EngineObjectModificationInput = z.input<typeof EngineObjectModificationSchema>;

export const TweenEasingSchema = z.enum(["linear", "ease-in", "ease-out", "ease-in-out"]).default("linear");
export type TweenEasing = z.infer<typeof TweenEasingSchema>;
export type TweenEasingInput = z.input<typeof TweenEasingSchema>;

export const TweenSchema = z.object({
    ms: z.number().positive(),
    easing: TweenEasingSchema,
});
export type Tween = z.infer<typeof TweenSchema>;
export type TweenInput = z.input<typeof TweenSchema>;

// TODO: prefab for dom mirror
// TODO: support parenting
// TODO: split these schemas too in the same manner as builders
