import type { Vector3 } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

export const DOMMirror = ({ position, height }: { position: Vector3; height: number }) => {
    const videoRef = useRef(document.createElement("video"));

    // State 1: The actual tab dimensions (the content)
    const [tabDims, setTabDims] = useState({ width: 16, height: 9 });
    // State 2: The oversized square stream (the envelope)
    const [videoDims, setVideoDims] = useState({ width: 0, height: 0 });

    const texture = useMemo(() => {
        const video = videoRef.current;
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;
        // Leave matrixAutoUpdate as true so ThreeJS applies our repeat/offset changes
        return new THREE.VideoTexture(video);
    }, []);

    // --- THIS IS THE CORRECTED LETTERBOX MATH ---
    useEffect(() => {
        if (videoDims.width === 0 || videoDims.height === 0) return;

        const tab_w = tabDims.width;
        const tab_h = tabDims.height;
        const env_w = videoDims.width;
        const env_h = videoDims.height;

        const tabAspect = tab_w / tab_h;
        const envAspect = env_w / env_h;

        let repeat_x, repeat_y, offset_x, offset_y;

        if (tabAspect > envAspect) {
            // Tab is wider than the envelope.
            // Chrome matches the width, but adds padding to top/bottom.
            repeat_x = 1.0; // Use 100% of the envelope's width
            repeat_y = envAspect / tabAspect; // Only use a fraction of the height

            offset_x = 0;
            // Center it vertically.
            offset_y = (1 - repeat_y) / 2;

            /* NOTE: If it looks cut off at the bottom, Chrome anchored the tab
               to the TOP of the square instead of the center. If so, use this:
               offset_y = 1 - repeat_y;
            */
        } else {
            // Tab is taller than envelope.
            // Chrome matches the height, but adds padding to left/right.
            repeat_x = tabAspect / envAspect;
            repeat_y = 1.0;

            // Center it horizontally.
            offset_x = (1 - repeat_x) / 2;
            offset_y = 0;
        }

        texture.repeat.set(repeat_x, repeat_y);
        texture.offset.set(offset_x, offset_y);
        texture.needsUpdate = true;

    }, [tabDims, videoDims, texture]);

    useEffect(() => {
        const handle_message = async (message: any) => {
            // Keep tab dimensions continuously synced
            if (
                message.type === "VVR_STREAM" ||
                message.type === "VVR_DIMENSIONS_UPDATED"
            ) {
                if (message.tab?.width && message.tab?.height) {
                    setTabDims({
                        width: message.tab.width,
                        height: message.tab.height
                    });
                }
            }

            if (message.type === "VVR_STREAM") {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        mandatory: {
                            chromeMediaSource: "tab",
                            chromeMediaSourceId: message.stream
                        }
                    }
                });

                const video = videoRef.current;
                video.srcObject = stream;

                video.onloadedmetadata = () => {
                    video.play();
                    // Lock in the oversized envelope dimensions once it loads
                    setVideoDims({
                        width: video.videoWidth,
                        height: video.videoHeight
                    });
                };
            }
        };

        chrome.runtime.onMessage.addListener(handle_message);
        chrome.runtime.sendMessage({ action: "VVR_START_STREAM" });

        return () => chrome.runtime.onMessage.removeListener(handle_message);
    }, []);

    // 3. Resize the physical plane to exactly match the tab's aspect ratio
    const planeWidth = (tabDims.width / tabDims.height) * height

    return (
        <mesh position={position}>
            <planeGeometry args={[planeWidth, height]} />
            <meshBasicMaterial map={texture} toneMapped={false} />
        </mesh>
    );
};
