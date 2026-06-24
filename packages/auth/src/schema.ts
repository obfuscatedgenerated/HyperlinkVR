import { z } from "zod";

export const AUTH_METHODS = ["static", "jwt"] as const;


export const JWK_EC_Schema = z.object({
    kty: z.literal("EC"),
    crv: z.enum(["P-256", "P-384", "P-521"]),
    x: z.string(),
    y: z.string(),
    ext: z.boolean().optional()
});
export type JWK_EC = z.infer<typeof JWK_EC_Schema>;

export const JWK_OKP_Schema = z.object({
    kty: z.literal("OKP"),
    crv: z.literal("Ed25519"),
    x: z.string(), // Base64url encoded public key
    ext: z.boolean().optional()
});
export type JWK_OKP = z.infer<typeof JWK_OKP_Schema>;

export const DeviceRecordSchema = z.object({
    device_id: z.string(),
    label: z.string(),
    added_at: z.number(),
    public_key: z.union([JWK_EC_Schema, JWK_OKP_Schema])
});
export type DeviceRecord = z.infer<typeof DeviceRecordSchema>;

export const StaticIdentityRecordSchema_VERSION = 1;
export const StaticIdentityRecordSchema = z.object({
    $schema: z
        .string()
        .optional()
        .default(`https://vvr.ollieg.codes/schemas/StaticIdentityRecord_v${StaticIdentityRecordSchema_VERSION}.json`),
    version: z.number().int().min(1).max(StaticIdentityRecordSchema_VERSION),
    identity: z.string(),
    created_at: z.number(),
    status: z.enum(["active", "suspended"]),
    devices: z.array(DeviceRecordSchema)
}).meta({
    name: "StaticIdentityRecord",
    version: StaticIdentityRecordSchema_VERSION,
    title: "ViewportVR - Static Identity Record",
    description: "A static identity record for ViewportVR to authenticate users on a static site, under the .well-known/vvr/auth/* path."
});
export type StaticIdentityRecord = z.infer<typeof StaticIdentityRecordSchema>;


export const AuthManifestSchema_VERSION = 1;
export const AuthManifestSchema = z
    .object({
        $schema: z
            .string()
            .optional()
            .default(
                `https://vvr.ollieg.codes/schemas/AuthManifest_v${AuthManifestSchema_VERSION}.json`
            ),
        version: z.number().int().min(1).max(AuthManifestSchema_VERSION),

        methods: z
            .array(z.enum(AUTH_METHODS))
            .min(1)
            .describe("Supported authentication methods"),

        host_name: z.string().optional().describe("Host friendly name"),

        host_description: z.string().optional().describe("Host description"),

        host_icon: z.url().optional().describe("Host icon URL"),

        open_for_registration: z.boolean().optional().default(true)
            .describe("Open for registration?"),

        static_submit_hint: z
            .string()
            .optional()
            .describe(
                "[STATIC ONLY] Describe how users can submit their static identity record to the host, e.g. 'Email your static identity record to...', 'open a GitHub PR at ...', 'upload at ...' etc."
            )
    })
    .superRefine((data, ctx) => {
        // static submit hint should not be provided if static auth is not supported
        if (!data.methods.includes("static") && data.static_submit_hint) {
            ctx.addIssue({
                code: "custom",
                message:
                    "static_submit_hint should not be provided if static auth is not supported"
            });
        }
    })
    .meta({
        name: "AuthManifest",
        version: AuthManifestSchema_VERSION,
        title: "ViewportVR - Auth Manifest",
        description:
            "An auth manifest for ViewportVR to describe the authentication methods supported by a site, as well as friendly display properties, under the .well-known/vvr/auth-manifest.json path.",

        // enforce that if static_submit_hint given then must be static method available
        json_schema_extra: {
            if: {
                required: ["static_submit_hint"]
            },
            then: {
                properties: {
                    methods: {
                        contains: { const: "static" }
                    }
                },
                errorMessage: {
                    properties: {
                        methods: "static_submit_hint should not be provided if static auth is not supported"
                    }
                }
            }
        }
    });
export type AuthManifest = z.infer<typeof AuthManifestSchema>;

export const EXPORT_TO_JSON = [
    StaticIdentityRecordSchema,
    AuthManifestSchema
];
