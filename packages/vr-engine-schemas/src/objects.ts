import { z } from "zod";





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

export const CustomMeshColliderSchema = z.object({
    type: z.literal("custom-mesh"),
    mesh: z.string()
});
export type CustomMeshCollider = z.infer<typeof CustomMeshColliderSchema>;

export const CopyVisualMeshColliderSchema = z.object({
    type: z.literal("copy-visual-mesh")
});
export type CopyVisualMeshCollider = z.infer<
    typeof CopyVisualMeshColliderSchema
>;

export const ColliderSchema = z.discriminatedUnion("type", [
    BoxColliderSchema,
    SphereColliderSchema,
    CapsuleColliderSchema,
    CustomMeshColliderSchema,
    CopyVisualMeshColliderSchema
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
    report_collisions: z.boolean().default(false),
    report_motion: z.boolean().default(false)
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

export const GrabbableInteractionSchema = z.object({
    type: z.literal("grabbable"),
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

export const ControllerButtonInteractionSchema = z.object({
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

export const TriggerVolumeInteractionSchema = z.object({
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

export const InteractionSchema = z.discriminatedUnion("type", [
    GrabbableInteractionSchema,
    ControllerButtonInteractionSchema,
    TriggerVolumeInteractionSchema
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
    mesh: z.string().optional(),
    // material_override: MaterialSchema.optional(),
    physics: PhysicsSystemSchema.optional(),
    interactions: z.array(InteractionSchema).optional()
});
export type CustomObject = z.infer<typeof CustomObjectSchema>;
export type CustomObjectInput = z.input<typeof CustomObjectSchema>;

// TODO: built in primitive meshes, either by a path or explicit in schema. would be useless without material override tho

export const HexNumericalColorSchema = z.number().int().min(0).max(0xffffff);
export type HexNumericalColor = z.infer<typeof HexNumericalColorSchema>;

const BasePrefabSchema = z.object({
    type: z.literal("prefab"),
    name: z.string(),
});

export const ButtonPrefabSchema = BasePrefabSchema.extend({
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

export const EngineObjectDispatchSchema = z.object({
    object: EngineObjectSchema,
    transform: TransformSchema.optional(),
    user_data: z.record(z.string(), z.any()).optional()
});
export type EngineObjectDispatch = z.infer<typeof EngineObjectDispatchSchema>;
export type EngineObjectDispatchInput = z.input<typeof EngineObjectDispatchSchema>;

export const CreatedEngineObjectSchema = EngineObjectDispatchSchema.extend({
    id: z.string(),
    transform: TransformSchema // transform is guaranteed to be resolved now
});

export type CreatedEngineObject = z.infer<typeof CreatedEngineObjectSchema>;
export type CreatedEngineObjectInput = z.input<typeof CreatedEngineObjectSchema>;

// TODO: dispatch object modifications
