import type { Vector3 } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";





export const DOMMirror = ({position}: {position: Vector3}) => {
    const videoRef = useRef(document.createElement("video"));

    // Create the texture once and memoize it
    const texture = useMemo(() => {
        const video = videoRef.current;
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;
        return new THREE.VideoTexture(video);
    }, []);

    useEffect(() => {
        // wait for a stream id from the background script
        const handle_message = async (message: any) => {
            if (message.type === "VVR_STREAM") {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        mandatory: {
                            chromeMediaSource: "tab",
                            chromeMediaSourceId: message.stream
                        }
                    }
                });

                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }

            // TODO: fix square stream, also get geometry to match ratio (and be a bit smaller)
        }

        chrome.runtime.onMessage.addListener(handle_message);

        // tell the background script to send us a stream id
        chrome.runtime.sendMessage({ action: "VVR_START_STREAM" });

        return () => {
            chrome.runtime.onMessage.removeListener(handle_message);
        };
    }, []);

    return (
        <mesh position={position}>
            <planeGeometry args={[16, 9]} />
            <meshBasicMaterial map={texture} toneMapped={false} />
        </mesh>
    );
};
