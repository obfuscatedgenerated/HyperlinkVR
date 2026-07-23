import {z} from "zod";

export const BindingConfigSchema = z.object({
    id: z.string().optional(),   // routing id, minted at dispatch
    name: z.string().optional()  // author label, used to bind callbacks
});
export type BindingConfig = z.infer<typeof BindingConfigSchema>;
export const bindable = <T extends z.ZodRawShape>(shape: T) =>
    z.object({...shape, binding: BindingConfigSchema.optional()});
export type Bindable<T extends z.ZodRawShape = any> = z.infer<ReturnType<typeof bindable<T>>> & {
    binding?: BindingConfig
};
