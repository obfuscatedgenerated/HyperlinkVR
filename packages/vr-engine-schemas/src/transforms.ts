import {z} from "zod";

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
export const PartialTransformSchema = z.object({
    position: z.tuple([z.number(), z.number(), z.number()]).optional(),
    rotation: RotationSchema.optional(),
    scale: z.tuple([z.number(), z.number(), z.number()]).optional()
});
export type PartialTransform = z.infer<typeof PartialTransformSchema>;
export type PartialTransformInput = z.input<typeof PartialTransformSchema>;
