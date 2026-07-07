import { useEffect } from "react";

import { useWebSDKMessaging } from "../contexts/WebSDKMessagingContext";
import { useEngineObjectStore } from "../stores/EngineObjectStore";
import { EngineObjectDispatchSchema } from "@hyperlinkvr/vr-engine-schemas";


export const EngineObjectSync = () => {
    const rtc = useWebSDKMessaging();
    const { add_object, remove_object } = useEngineObjectStore();

    useEffect(() => {
        const unlisten_create = rtc.on_action("HVRSDK_CREATE_ENGINE_OBJECT", (message, reply) => {
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
            console.log("(-) Destroyed engine object", message.object_id);
            remove_object(message.object_id);

            reply({
                for: "HVRSDK_DESTROY_ENGINE_OBJECT",
                object_id: message.object_id
            });
        });

        return () => {
            unlisten_create();
            unlisten_destroy();
        };
    }, [rtc, add_object, remove_object]);

    return null;
}
