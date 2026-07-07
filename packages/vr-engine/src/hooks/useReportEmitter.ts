import type { ReportConfig, ReportEvent } from "@hyperlinkvr/vr-engine-schemas";
import { useCallback } from "react";

import { useObjectRefs } from "../contexts/ObjectRefsContext";
import { useWebSDKMessaging } from "../contexts/WebSDKMessagingContext";

type ReportBody = Pick<ReportEvent, "kind" | "payload">;

export const useReportEmitter = (reporting: ReportConfig | undefined) => {
    const { emit_event, connected } = useWebSDKMessaging();
    const { id: object_id } = useObjectRefs();

    const source_id = reporting?.id;

    return useCallback(
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
};
