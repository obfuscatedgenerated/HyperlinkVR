import { type StorageEngine } from "@viewportvr/core";



import type { Identity, StoredKey } from "./index";
import { DeviceRecordSchema, StaticIdentityRecordSchema, type DeviceRecord, type StaticIdentityRecord } from "./schema";


interface SuccessfulRecordResolution {
    success: true;
    record: StaticIdentityRecord | undefined;
}

interface FailedRecordResolution {
    success: false;
    error: string;
}

type StaticRecordResolution =
    | SuccessfulRecordResolution
    | FailedRecordResolution;

export const resolve_static_record = async (
    identity: Identity
): Promise<StaticRecordResolution> => {
    const static_record_response = await fetch(
        `https://${identity.host}/.well-known/vvr/auth/${identity.name}.json`
    );

    if (!static_record_response.ok) {
        if (static_record_response.status === 404) {
            return {
                success: true,
                record: undefined
            };
        } else {
            return {
                success: false,
                error: `Failed to fetch static auth record: ${static_record_response.statusText}`
            };
        }
    }

    try {
        const record = await static_record_response.json();

        // validate record against schema
        const { success, error } = StaticIdentityRecordSchema.safeParse(record);
        if (!success) {
            return {
                success: false,
                error: `Invalid static auth record: ${error}`
            };
        }

        return {
            success: true,
            record
        };
    } catch (error) {
        return {
            success: false,
            error: `Failed to parse static auth record: ${error}`
        };
    }
};

export const generate_jwk_keys = async () => {
    const keypair = await crypto.subtle.generateKey(
        {
            name: "Ed25519",
        },
        true,
        ["sign", "verify"]
    ) as CryptoKeyPair;

    const public_key = await crypto.subtle.exportKey("jwk", keypair.publicKey);
    const private_key = await crypto.subtle.exportKey("jwk", keypair.privateKey);

    return {
        public_key,
        private_key
    };
}

export const generate_device_record = async (public_key: JsonWebKey, label?: string): Promise<DeviceRecord> => {
    const device_id = crypto.randomUUID();
    const effective_label = label || `Device ${device_id}`;
    const added_at = Date.now();

    return DeviceRecordSchema.parse({
        device_id,
        label: effective_label,
        added_at,
        public_key
    });
}

export const generate_static_identity_record = async (identity: Identity, devices: DeviceRecord[], status: "active" | "suspended" = "active"): Promise<StaticIdentityRecord> => {
    const created_at = Date.now();

    return StaticIdentityRecordSchema.parse({
        version: 1,
        identity: `${identity.name}@${identity.host}`,
        created_at,
        status,
        devices
    });
}

export const add_device_to_static_record = async (record: StaticIdentityRecord, device: DeviceRecord): Promise<StaticIdentityRecord> => {
    const updated_devices = [...record.devices, device];

    return StaticIdentityRecordSchema.parse({
        ...record,
        devices: updated_devices
    });
}

export const store_private_key = async (identity: Identity, private_key: JsonWebKey, storage: StorageEngine<"local">) => {
    const key_identifier = `keystore:${identity.name}@${identity.host}`;

    if (await storage.get(key_identifier)) {
        throw new Error(`Private key for ${identity.name}@${identity.host} already exists in storage`);
    }

    await storage.set(key_identifier, {
        method: "static",
        key: private_key
    });
}

export const signup_static = async (identity: Identity, storage: StorageEngine<"local">, device_label?: string): Promise<StaticIdentityRecord> => {
    const { public_key, private_key } = await generate_jwk_keys();

    const device_record = await generate_device_record(public_key, device_label);

    const static_record = await generate_static_identity_record(identity, [device_record]);

    await store_private_key(identity, private_key, storage);

    // TODO: should we sanity check the keys?
    return static_record;
}

export const load_stored_private_key = async (
    identity: Identity,
    storage: StorageEngine<"local">
): Promise<JsonWebKey | null> => {
    const key_identifier = `keystore:${identity.name}@${identity.host}`;
    const stored_key = await storage.get<StoredKey>(key_identifier);

    if (!stored_key) {
        return null;
    }

    if (stored_key.method !== "static") {
        return null;
    }

    return stored_key.key as JsonWebKey;
};

interface SuccessfulStaticCredentialCheckResult {
    success: true;
    device: DeviceRecord;
}

interface FailedStaticCredentialCheckResult {
    success: false;
}

type StaticCredentialCheckResult = SuccessfulStaticCredentialCheckResult | FailedStaticCredentialCheckResult;

export const check_static_credentials = async (
    identity: Identity,
    storage: StorageEngine<"local">,
    challenge?: string,
    device?: DeviceRecord,
): Promise<StaticCredentialCheckResult> => {
    const private_key = await load_stored_private_key(identity, storage);
    if (!private_key) {
        return {
            success: false
        };
    }

    if (!challenge) {
        challenge = crypto.randomUUID();
    }

    // sign the challenge with the private key
    const private_key_obj = await crypto.subtle.importKey(
        "jwk",
        private_key,
        {
            name: "Ed25519"
        },
        false,
        ["sign"]
    );

    const encoder = new TextEncoder();
    const challenge_bytes = encoder.encode(challenge);

    const signature = await crypto.subtle.sign(
        {
            name: "Ed25519"
        },
        private_key_obj,
        challenge_bytes
    );

    // verify the signature with the public key from the static record against all devices TODO: caching
    const static_record_resolution = await resolve_static_record(identity);
    if (!static_record_resolution.success || !static_record_resolution.record) {
        return {
            success: false
        };
    }

    const devices = device ? [device] : static_record_resolution.record.devices;
    for (const device of devices) {
        const public_key_obj = await crypto.subtle.importKey(
            "jwk",
            device.public_key,
            {
                name: "Ed25519"
            },
            false,
            ["verify"]
        );

        const is_valid = await crypto.subtle.verify(
            {
                name: "Ed25519"
            },
            public_key_obj,
            signature,
            challenge_bytes
        );

        if (is_valid) {
            return {
                success: true,
                device
            };
        }
    }

    return {
        success: false
    };
};

export const what_device_am_i = async (identity: Identity, storage: StorageEngine<"local">): Promise<DeviceRecord | null> => {
    const check_result = await check_static_credentials(identity, storage);
    if (check_result.success) {
        return check_result.device;
    }

    return null;
}
