import { useFrame } from "@react-three/fiber";
import { Container } from "@react-three/uikit";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";



import { useStorage } from "@plasmohq/storage/hook";

import {
    WATCH_UI_HEIGHT,
    WATCH_UI_WIDTH,
    WatchUI
} from "~components/3d/ui/WatchUI";





const OPEN_THRESHOLD = 0.85; // Harder to open
const CLOSE_THRESHOLD = 0.7; // Easier to keep open

export const WristWatch = () => {
    const watchGroupRef = useRef<THREE.Group>(null);
    const uiGroupRef = useRef<THREE.Group>(null);

    const [isOpen, setIsOpen] = useState(false);

    const math = useMemo(
        () => ({
            camPos: new THREE.Vector3(),
            watchPos: new THREE.Vector3(),
            watchQuat: new THREE.Quaternion(),
            watchUp: new THREE.Vector3(),
            dirToCam: new THREE.Vector3()
        }),
        []
    );

    const [watch_hand] = useStorage("settings.watch_hand", "left");

    // Notice we grab `xrFrame` from the useFrame callback!
    useFrame((state, delta, xrFrame) => {
        const xr = state.gl.xr;
        const session = xr.getSession();

        if (
            !session ||
            !xrFrame ||
            !watchGroupRef.current ||
            !uiGroupRef.current
        )
            return;

        // 1. Find the raw WebXR input source for our chosen hand
        let targetSource = null;
        for (let i = 0; i < session.inputSources.length; i++) {
            if (session.inputSources[i].handedness === watch_hand) {
                targetSource = session.inputSources[i];
                break;
            }
        }

        // 2. Safely extract the position natively, bypassing Three.js indexing bugs
        if (targetSource && targetSource.gripSpace) {
            const referenceSpace = xr.getReferenceSpace();
            if (referenceSpace) {
                const pose = xrFrame.getPose(
                    targetSource.gripSpace,
                    referenceSpace
                );

                if (pose) {
                    const { position, orientation } = pose.transform;

                    watchGroupRef.current.position.set(
                        position.x,
                        position.y,
                        position.z
                    );
                    watchGroupRef.current.quaternion.set(
                        orientation.x,
                        orientation.y,
                        orientation.z,
                        orientation.w
                    );

                    // rotate around the X axis to tilt the watch face towards the user
                    watchGroupRef.current.rotateX(-Math.PI / 3);

                    // then rotate 90 degrees so its on top of the wrist
                    watchGroupRef.current.rotateZ(
                        watch_hand === "left" ? Math.PI / 2 : -Math.PI / 2
                    );

                    // --- REFINED WRIST OFFSETS ---
                    // Assuming standard VR controller orientation:
                    // Y+ is usually "up" along the handle
                    // Z+ is usually pointing "forward" from the palm
                    // X+ is usually to the "right"
                    watchGroupRef.current.translateZ(-0.01); // Move up the arm (less than 0.12 might feel better)
                    watchGroupRef.current.translateY(0.055); // Lift slightly off the skin
                    watchGroupRef.current.translateX(
                        watch_hand === "left" ? 0.02 : -0.02
                    ); // Invert for right hand!
                }
            }
        }

        // 3. THE GAZE MATH (Rec Room Style)
        state.camera.getWorldPosition(math.camPos);
        watchGroupRef.current.getWorldPosition(math.watchPos);
        watchGroupRef.current.getWorldQuaternion(math.watchQuat);

        math.dirToCam.subVectors(math.camPos, math.watchPos).normalize();
        math.watchUp.set(0, 1, 0).applyQuaternion(math.watchQuat);

        const dotProduct = math.dirToCam.dot(math.watchUp);
        const distance = math.camPos.distanceTo(math.watchPos);

        if (distance < 0.6) {
            if (dotProduct > OPEN_THRESHOLD) {
                setIsOpen(true);
            } else if (dotProduct < CLOSE_THRESHOLD) {
                setIsOpen(false);
            }
        } else {
            setIsOpen(false); // Force close if too far away
        }

        // 4. ANIMATE THE EXPANDING UI
        const targetScale = isOpen ? 1 : 0;
        const currentScale = uiGroupRef.current.scale.x;
        const newScale = THREE.MathUtils.lerp(currentScale, targetScale, 0.15);

        uiGroupRef.current.scale.set(newScale, newScale, newScale);
    });

    return (
        <group ref={watchGroupRef}>
            <mesh>
                <boxGeometry args={[0.05, 0.01, 0.06]} />
                <meshStandardMaterial color="#222222" />
            </mesh>

            <group
                name="WatchUI"
                ref={uiGroupRef}
                position={[0, 0.05, -0.05]}
                rotation={[
                    -Math.PI / 2,
                    0,
                    watch_hand === "left" ? Math.PI / 2 : -Math.PI / 2
                ]}
            >

                <Container
                    sizeX={0.3}
                    sizeY={0.2}
                    width={WATCH_UI_WIDTH}
                    height={WATCH_UI_HEIGHT}
                    flexDirection="column"
                >
                    <WatchUI />
                </Container>
            </group>
        </group>
    );
};
