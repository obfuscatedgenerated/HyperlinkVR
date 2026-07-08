import { useEffect } from "react";

import { useWebSDKMessaging } from "../contexts/WebSDKMessagingContext";
import { useEngineObjectStore } from "../stores/EngineObjectStore";
import {EngineObjectDispatchSchema, EngineObjectModificationSchema} from "@hyperlinkvr/vr-engine-schemas";
import {get_object_refs} from "./object_ref_registry";
import {apply_modification, sample_live_transform} from "./object_modification";


export const EngineObjectSync = () => {
    const rtc = useWebSDKMessaging();

    useEffect(() => {
        const unlisten_create = rtc.on_action("HVRSDK_CREATE_ENGINE_OBJECT", (message, reply) => {
            const {add_object} = useEngineObjectStore.getState();

            const {success, data} = EngineObjectDispatchSchema.safeParse(message.object);
            if (!success) {
                // TODO: proper error support, this is just stuffing it into a type that wont go. just need a standard error reply then expect it on the builder's create method/sdk sender
                console.error("Failed to parse engine object dispatch", data);
                reply({ success: false, error: "Failed to parse engine object dispatch" });
                return;
            }

            const id = crypto.randomUUID();
            const created_object = { id, ...data };
            console.log("(+) Created engine object", created_object);
            add_object(created_object);

            reply({
                for: "HVRSDK_CREATE_ENGINE_OBJECT",
                object: created_object
            });
        });

        const unlisten_destroy = rtc.on_action("HVRSDK_DESTROY_ENGINE_OBJECT", (message, reply) => {
            const {remove_object} = useEngineObjectStore.getState();

            console.log("(-) Destroyed engine object", message.object_id);
            remove_object(message.object_id);

            reply({
                for: "HVRSDK_DESTROY_ENGINE_OBJECT",
                object_id: message.object_id
            });
        });

        const unlisten_refresh = rtc.on_action("HVRSDK_REFRESH_ENGINE_OBJECT", (message, reply) => {
            const {get_object} = useEngineObjectStore.getState();

            const stored = get_object(message.object_id);
            if (!stored) {
                // TODO: proper error support
                reply({ success: false, error: `No object found with id ${message.object_id}` });
                return;
            }

            const refs = get_object_refs(message.object_id);
            if (!refs) {
                reply({ success: false, error: `No refs found for object with id ${message.object_id}` });
                return;
            }

            const live = {
                ...stored,
                transform: sample_live_transform(refs)
            };

            reply({
                for: "HVRSDK_REFRESH_ENGINE_OBJECT",
                object: live
            });
        });

        const unlisten_modify = rtc.on_action("HVRSDK_MODIFY_ENGINE_OBJECT", (message, reply) => {
            const {get_object, add_object} = useEngineObjectStore.getState();

            const {success, data} = EngineObjectModificationSchema.safeParse(message.changes);
            if (!success) {
                reply({ success: false, error: `Failed to parse engine object modification: ${data}` });
                return;
            }

            const stored = get_object(message.object_id);
            if (!stored) {
                reply({ success: false, error: `No object found with id ${message.object_id}` });
                return;
            }

            const refs = get_object_refs(message.object_id);
            if (!refs) {
                reply({ success: false, error: `No refs found for object with id ${message.object_id}` });
                return;
            }

            // TODO: support tween

            const next = apply_modification(stored, data, refs);
            add_object(next);

            reply({
                for: "HVRSDK_MODIFY_ENGINE_OBJECT",
                object_id: message.object_id,
                success: true
            });
        });

        return () => {
            unlisten_create();
            unlisten_destroy();
            unlisten_refresh();
            unlisten_modify();
        };
    }, [rtc]);

    return null;
}
