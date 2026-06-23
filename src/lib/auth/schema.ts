import { z } from "zod";



import { AUTH_METHODS } from "~lib/auth";





export const JWK_EC_Schema = z.object({
    kty: z.literal("EC"),
    crv: z.enum(["P-256", "P-384", "P-521"]),
    x: z.string(),
    y: z.string(),
    ext: z.boolean().optional()
});
export type JWK_EC = z.infer<typeof JWK_EC_Schema>;

export const DeviceRecordSchema = z.object({
    device_id: z.string(),
    label: z.string(),
    added_at: z.number(),
    public_key: JWK_EC_Schema
});
export type DeviceRecord = z.infer<typeof DeviceRecordSchema>;

export const StaticIdentityRecordSchema_VERSION = 1;
export const StaticIdentityRecordSchema = z.object({
    $schema: z.string().optional(),
    version: z.number().int().min(1).max(StaticIdentityRecordSchema_VERSION),
    identity: z.string(),
    created_at: z.number(),
    status: z.enum(["active", "suspended"]),
    devices: z.array(DeviceRecordSchema)
});
export type StaticIdentityRecord = z.infer<typeof StaticIdentityRecordSchema>;


export const AuthManifestSchema_VERSION = 1;
export const AuthManifestSchema = z.object({
    $schema: z.string().optional(),
    version: z.number().int().min(1).max(AuthManifestSchema_VERSION),

    methods: z.array(z.enum(AUTH_METHODS)).min(1),

    host_name: z.string().optional(),
    host_description: z.string().optional(),
    host_icon: z.url().optional(),
});
export type AuthManifest = z.infer<typeof AuthManifestSchema>;

export const EXPORT_TO_JSON = [
    {
        schema: StaticIdentityRecordSchema,
        name: "StaticIdentityRecord",
        version: StaticIdentityRecordSchema_VERSION,
        title: "ViewportVR - Static Identity Record",
        description: "A static identity record for ViewportVR to authenticate users on a static site, under the .well-known/vvr/auth/* path."
    },
    {
        schema: AuthManifestSchema,
        name: "AuthManifest",
        version: AuthManifestSchema_VERSION,
        title: "ViewportVR - Auth Manifest",
        description: "An auth manifest for ViewportVR to describe the authentication methods supported by a site, as well as friendly display properties, under the .well-known/vvr/auth-manifest.json path."
    }
];
