import type { BindingConfig, ReportEvent } from "@hyperlinkvr/vr-engine-schemas";
import {useCallback, useEffect, useRef} from "react";

import { useObjectRefs } from "../contexts/ObjectRefsContext";
import { useWebSDKMessaging } from "../contexts/WebSDKMessagingContext";

type ReportBody = Pick<ReportEvent, "kind" | "payload">;

export const useObjectBinding = (binding: BindingConfig | undefined) => {
    const { emit_event, connected, on_action } = useWebSDKMessaging();
    const { id: object_id } = useObjectRefs();

    const source_id = binding?.id;

    const emit_report = useCallback(
        (body: ReportBody) => {
            if (!source_id || !connected) {
                return;
            }

            try {
                emit_event({
                    type: "HVRSDK_ENGINE_OBJECT_REPORT",
                    report: {
                        source_id,
                        object_id,
                        ts: performance.now(),
                        ...body
                    } as ReportEvent
                });
            } catch (error) {
                console.warn("Failed to emit report event", error);
            }
        },
        [source_id, object_id, connected, emit_event]
    );

    const command_callback = useRef<(command: string, args?: any) => Promise<any> | null>(null);

    const on_command = useCallback((callback: (command: string, args?: any) => Promise<any> | null) => {
        command_callback.current = callback;

        return () => {
            if (command_callback.current === callback) {
                command_callback.current = null;
            }
        }
    }, []);

    useEffect(() => {
        if (!source_id) {
            return;
        }

        const unlisten = on_action("HVRSDK_INTERACTION_COMMAND", async (data, reply) => {
            if (data.object_id !== object_id || data.interaction_id !== source_id) {
                return;
            }

            if (command_callback.current) {
                let response;
                try {
                    response = await command_callback.current(data.command, data.args);
                } catch (error) {
                    console.error("Error handling interaction command:", error);
                    response = {error: error instanceof Error ? error.message : String(error)};
                }

                reply({
                    for: "HVRSDK_INTERACTION_COMMAND",
                    object_id: data.object_id,
                    interaction_id: data.interaction_id,
                    response
                });
            }
        });

        return () => {
            unlisten();
        };
    }, [object_id, source_id, on_action]);

    return {
        emit_report,
        on_command
    };
};
