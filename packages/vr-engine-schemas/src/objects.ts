import { z } from "zod";

export const BindingConfigSchema = z.object({
    id: z.string().optional(),   // routing id, minted at dispatch
    name: z.string().optional()  // author label, used to bind callbacks
});
export type BindingConfig = z.infer<typeof BindingConfigSchema>;
const bindable = <T extends z.ZodRawShape>(shape: T) =>
    z.object({ ...shape, binding: BindingConfigSchema.optional() });

export type Bindable<T extends z.ZodRawShape = any> = z.infer<ReturnType<typeof bindable<T>>> & {binding?: BindingConfig};

// TODO: collider offsets. and is collider combo possible?

export const BoxColliderSchema = z.object({
    type: z.literal("box"),
    size: z.tuple([z.number(), z.number(), z.number()])
});
export type BoxCollider = z.infer<typeof BoxColliderSchema>;

export const SphereColliderSchema = z.object({
    type: z.literal("sphere"),
    radius: z.number().positive()
});
export type SphereCollider = z.infer<typeof SphereColliderSchema>;

export const CapsuleColliderSchema = z.object({
    type: z.literal("capsule"),
    radius: z.number().positive(),
    height: z.number().positive()
});
export type CapsuleCollider = z.infer<typeof CapsuleColliderSchema>;

export const CustomMeshApproximationSchema = z.enum(["hull", "trimesh"]).default("hull");
export type CustomMeshApproximation = z.infer<typeof CustomMeshApproximationSchema>;

export const CustomMeshColliderSchema = z.object({
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

export const AutoColliderSchema = z.object({
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
    CustomMeshColliderSchema,
    AutoColliderSchema
]);
export type Collider = z.infer<typeof ColliderSchema>;

export const FixedRigidBodySchema = z.object({
    type: z.literal("fixed"),
    collider: ColliderSchema.optional()
});
export type FixedRigidBody = z.infer<typeof FixedRigidBodySchema>;
export type FixedRigidBodyInput = z.input<typeof FixedRigidBodySchema>;

export const DynamicRigidBodySchema = z.object({
    type: z.literal("dynamic"),
    mass: z.number().positive(),
    velocity: z.tuple([z.number(), z.number(), z.number()]).optional(),
    collider: ColliderSchema.optional()
});
export type DynamicRigidBody = z.infer<typeof DynamicRigidBodySchema>;
export type DynamicRigidBodyInput = z.input<typeof DynamicRigidBodySchema>;

export const KinematicPositionRigidBodySchema = z.object({
    type: z.literal("kinematic-pos"),
    collider: ColliderSchema.optional()
});
export type KinematicPositionRigidBody = z.infer<
    typeof KinematicPositionRigidBodySchema
>;
export type KinematicPositionRigidBodyInput = z.input<
    typeof KinematicPositionRigidBodySchema
>;

export const KinematicVelocityRigidBodySchema = z.object({
    type: z.literal("kinematic-vel"),
    velocity: z.tuple([z.number(), z.number(), z.number()]),
    collider: ColliderSchema.optional()
});
export type KinematicVelocityRigidBody = z.infer<
    typeof KinematicVelocityRigidBodySchema
>;
export type KinematicVelocityRigidBodyInput = z.input<
    typeof KinematicVelocityRigidBodySchema
>;

export const RigidBodySchema = z.discriminatedUnion("type", [
    FixedRigidBodySchema,
    DynamicRigidBodySchema,
    KinematicPositionRigidBodySchema,
    KinematicVelocityRigidBodySchema
]);
export type RigidBody = z.infer<typeof RigidBodySchema>;
export type RigidBodyInput = z.input<typeof RigidBodySchema>;
export type RigidBodyType = RigidBody["type"];

export const PhysicsSystemSchema = z.object({
    rigid_body: RigidBodySchema.optional(),
    //joints: // to be added later
    // report_collisions: z.boolean().default(false),
    // report_motion: z.boolean().default(false)
    // TODO: move the top to monitors? or just add ids in place. either way neither supported yet
});
export type PhysicsSystem = z.infer<typeof PhysicsSystemSchema>;
export type PhysicsSystemInput = z.input<typeof PhysicsSystemSchema>;

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
    position: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
    rotation: RotationSchema.default([0, 0, 0]),
    scale: z.tuple([z.number(), z.number(), z.number()]).default([1, 1, 1])
});
export type Transform = z.infer<typeof TransformSchema>;
export type TransformInput = z.input<typeof TransformSchema>;

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
    report_proximity: z.boolean().default(false)
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

export const TriggerVolumeInteractionSchema = bindable({
    type: z.literal("trigger-volume"),
    collider: ColliderSchema,
    report_enter: z.boolean().default(true),
    report_exit: z.boolean().default(true),
    ignore_hands: z.boolean().default(false),
    ignore_torso: z.boolean().default(false),
    ignore_head: z.boolean().default(false)
});
export type TriggerVolumeInteraction = z.infer<
    typeof TriggerVolumeInteractionSchema
>;
export type TriggerVolumeInteractionInput = z.input<
    typeof TriggerVolumeInteractionSchema
>;

export const FollowPlayerInteractionSchema = z.object({
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

export const InteractionSchema = z.discriminatedUnion("type", [
    GrabbableInteractionSchema,
    ControllerButtonInteractionSchema,
    TriggerVolumeInteractionSchema,
    FollowPlayerInteractionSchema,
    PositionalAudioInteractionSchema,
    GlobalAudioInteractionSchema
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

export const HexNumericalColorSchema = z.number().int().min(0).max(0xffffff);
export type HexNumericalColor = z.infer<typeof HexNumericalColorSchema>;

export const ButtonPrefabSchema = bindable({
    type: z.literal("prefab"),
    name: z.literal("button"),
    label: z.string(),
    color: HexNumericalColorSchema.default(0x00ff00),
    report_press: z.boolean().default(true),
    report_release: z.boolean().default(true)
});
export type ButtonPrefab = z.infer<typeof ButtonPrefabSchema>;
export type ButtonPrefabInput = z.input<typeof ButtonPrefabSchema>;

export const PrefabSchema = z.discriminatedUnion("name", [ButtonPrefabSchema]);
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
    monitors: z.array(MonitorSchema).optional()
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
    monitors: z.array(MonitorSchema).optional()
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
