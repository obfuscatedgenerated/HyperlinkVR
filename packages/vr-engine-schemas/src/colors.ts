import {z} from "zod";

export const HexNumericalColorSchema = z.number().int().min(0).max(0xffffff);
export type HexNumericalColor = z.infer<typeof HexNumericalColorSchema>;
export const HexStringColorSchema = z.string().regex(/^#([0-9a-fA-F]{6})$/);
export type HexStringColor = z.infer<typeof HexStringColorSchema>;
export const HexColorSchema = z.union([HexNumericalColorSchema, HexStringColorSchema]);
export type HexColor = z.infer<typeof HexColorSchema>;
