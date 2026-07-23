import {z} from "zod";

export const TweenEasingSchema = z.enum(["linear", "ease-in", "ease-out", "ease-in-out"]).default("linear");
export type TweenEasing = z.infer<typeof TweenEasingSchema>;
export type TweenEasingInput = z.input<typeof TweenEasingSchema>;
export const TweenSchema = z.object({
    ms: z.number().positive(),
    easing: TweenEasingSchema,
});
export type Tween = z.infer<typeof TweenSchema>;
export type TweenInput = z.input<typeof TweenSchema>;
