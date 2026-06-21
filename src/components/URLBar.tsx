import { Text } from "@react-three/drei";
import type { Vector3 } from "@react-three/fiber";
import { useEffect, useState } from "react";
import { configureTextBuilder } from "troika-three-text";

// its not happy! turn off web workers
configureTextBuilder({
    useWorker: false
});

export const URLBar = ({position, height, height_of_dom_mirror}: {position: Vector3; height: number; height_of_dom_mirror: number}) => {
    const [url, setUrl] = useState("");
    const [width, setWidth] = useState(0);
    
    useEffect(() => {
        // listen to the VVR_URL_UPDATE messages, as well as VVR_DIMENSIONS_UPDATE to update the width ONLY
        const handle_message = (msg: any) => {
            if (msg.type === "VVR_URL_UPDATE") {
                setUrl(msg.url);
            }

            if (msg.type === "VVR_DIMENSIONS_UPDATE") {
                // perform same aspect math to match the width of dom mirror (TODO: move logic to higher component or just make this a child of DOM mirror)
                const new_width = (msg.tab.width / msg.tab.height) * height_of_dom_mirror;
                setWidth(new_width);
            }
        }
        
        chrome.runtime.onMessage.addListener(handle_message);
        return () => chrome.runtime.onMessage.removeListener(handle_message);
    }, []);
    
    return (
        <>
            <mesh position={[
                position[0],
                position[1],
                position[2] - 0.01
            ]}>
                <boxGeometry args={[width, height, 0.01]} />
                <meshStandardMaterial color="white" />
            </mesh>

            <Text position={position} color="black" anchorX="center" anchorY="middle" fontSize={height * 0.5} maxWidth={width * 0.9}>
                {url}
            </Text>
        </>
    );
}
