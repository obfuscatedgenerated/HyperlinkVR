import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import {
    PointerCursorModel,
    PointerRayModel,
    useRayPointer,
    useTouchPointer,
    useXRInputSourceStateContext,
    XRSpace
} from "@react-three/xr";
import { useStorage } from "@viewportvr/react";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { get_asset_path } from "@viewportvr/asset-resolver";

const ASSET_PKG = "vr-engine/assets";

const left_hand = get_asset_path("hands/left.glb", ASSET_PKG);
const right_hand = get_asset_path("hands/right.glb", ASSET_PKG);

const FINGER_NAMES = ["middle", "ring", "pinky"];
const SEGMENT_NAMES = ["proximal", "intermediate", "distal"];
const X_AXIS = new THREE.Vector3(1, 0, 0);
const Z_AXIS = new THREE.Vector3(0, 0, 1);

type ChainLink = {
    bone: THREE.Object3D;
    bindQuat: THREE.Quaternion;
    bindQuatInverse: THREE.Quaternion;
    bindPos: THREE.Vector3;
};

// TODO: disable ray when touch has a hit
// TODO: prevent double touch when passing through watch

export const FakeHand = () => {
    // which hand is this?
    const state = useXRInputSourceStateContext("controller");
    const handedness = state.inputSource.handedness; // "left" or "right"

    const { scene: handScene } = useGLTF(
        handedness === "left" ? left_hand : right_hand
    );

    // which hand is the watch on?
    const [watch_hand] = useStorage("sync", "settings.watch_hand", "left");

    const rayOriginRef = useRef<THREE.Group>(null);
    const rayPointer = useRayPointer(rayOriginRef, state);
    const wasTriggerDownRef = useRef(false);
    const [debug_ray_hit] = useStorage(
        "sync",
        "settings.debug_ray_hits",
        false
    );

    const touchOriginRef = useRef<THREE.Group>(null);
    useTouchPointer(touchOriginRef, state);
    const [debug_touch] = useStorage("sync", "settings.debug_touch", false);

    // Smoothed curl amount (0 = open, ~1.2 = closed fist). This is the ONLY
    // value we smooth — every bone pose is derived from it each frame, so
    // the whole chain eases together instead of each bone fighting on its
    // own (which is what the old per-bone `slerp(self)` was trying, and
    // failing, to do).
    const curlRef = useRef(0);

    // Cached bind-pose data per finger, built once per hand model load.
    const chainsRef = useRef<Record<string, ChainLink[]> | null>(null);
    const thumbChainRef = useRef<ChainLink[] | null>(null);

    // 1. SAVE THE RESTING QUATERNIONS/POSITIONS, then build FK chains.
    useEffect(() => {
        if (!handScene) return;

        handScene.traverse((node: any) => {
            if (node.isBone && !node.userData.initialQuaternion) {
                node.userData.initialQuaternion = node.quaternion.clone();
                node.userData.initialPosition = node.position.clone();
            }
        });

        // IMPORTANT: in this rig, proximal/intermediate/distal are siblings
        // under "Armature" — NOT parented to each other. Rotating
        // "proximal" does not move "intermediate" or "distal" for free.
        // We rebuild the chain manually below using each bone's real
        // bind-pose offset from its neighbor (not a guessed fixed length),
        // cached once so we never recompute it per frame.
        const chains: Record<string, ChainLink[]> = {};

        FINGER_NAMES.forEach((finger) => {
            const bones = SEGMENT_NAMES.map((seg) =>
                handScene.getObjectByName(`${finger}-finger-phalanx-${seg}`)
            );
            if (bones.some((b) => !b)) return;

            chains[finger] = bones.map((bone: any) => {
                const bindQuat = bone.userData.initialQuaternion.clone();
                return {
                    bone,
                    bindQuat,
                    bindQuatInverse: bindQuat.clone().invert(),
                    bindPos: bone.userData.initialPosition.clone()
                };
            });
        });
        chainsRef.current = chains;

        const thumbBones = ["proximal", "distal"].map((seg) =>
            handScene.getObjectByName(`thumb-phalanx-${seg}`)
        );
        thumbChainRef.current = thumbBones.every(Boolean)
            ? thumbBones.map((bone: any) => {
                  const bindQuat = bone.userData.initialQuaternion.clone();
                  return {
                      bone,
                      bindQuat,
                      bindQuatInverse: bindQuat.clone().invert(),
                      bindPos: bone.userData.initialPosition.clone()
                  };
              })
            : null;
    }, [handScene]);

    const math = useMemo(
        () => ({
            raycaster: new THREE.Raycaster(),
            fwdVector: new THREE.Vector3(0, 0, -1),
            rayPos: new THREE.Vector3(),
            rayDir: new THREE.Vector3(),
            watchPos: new THREE.Vector3(),
            rayQuat: new THREE.Quaternion(),
            // FK scratch space — reused every frame instead of allocated,
            // which also fixes the per-frame `new THREE.Vector3()` /
            // `new THREE.Quaternion()` allocations the old code did inside
            // useFrame (extra GC churn you don't want on a VR frame budget).
            delta: new THREE.Quaternion(),
            localDeltaWorld: new THREE.Quaternion(),
            cumulative: new THREE.Quaternion(),
            offset: new THREE.Vector3(),
            thumbGoal: new THREE.Quaternion(),
            touchDebugArrow: debug_touch
                ? new THREE.ArrowHelper(
                      new THREE.Vector3(0, 0, -1), // Default forward
                      new THREE.Vector3(),
                      0.05,
                      0x00ff00 // Green
                  )
                : null
        }),
        [debug_touch]
    );

    useFrame((rootState, frameDelta, xrFrame) => {
        if (!handScene || !xrFrame || !chainsRef.current) return;

        const xr = rootState.gl.xr;
        const session = xr.getSession();
        if (!session) return;

        // need to manually wire up inputs
        const isTriggerDown =
            state.gamepad?.["xr-standard-trigger"]?.state === "pressed";
        if (isTriggerDown && !wasTriggerDownRef.current) {
            rayPointer.down({ timeStamp: performance.now(), button: 0 });
        } else if (!isTriggerDown && wasTriggerDownRef.current) {
            rayPointer.up({ timeStamp: performance.now(), button: 0 });
        }
        wasTriggerDownRef.current = isTriggerDown;

        // glue the touch ray to the fingertip
        if (touchOriginRef.current && touchOriginRef.current.parent) {
            const indexTipBone = handScene.getObjectByName(
                "index-finger-phalanx-distal"
            );
            if (indexTipBone) {
                // 1. Get the absolute world coordinates of the bone
                indexTipBone.getWorldPosition(math.rayPos);
                indexTipBone.getWorldQuaternion(math.rayQuat);

                // 2. Convert World Space -> Local Controller Space
                touchOriginRef.current.parent.worldToLocal(math.rayPos);

                touchOriginRef.current.parent.getWorldQuaternion(
                    math.cumulative
                );
                math.rayQuat.premultiply(math.cumulative.invert());

                // 3. Apply the safe, local coordinates!
                touchOriginRef.current.position.copy(math.rayPos);
                touchOriginRef.current.quaternion.copy(math.rayQuat);

                // shift out the finger a little so the ray doesn't start inside the hand mesh
                touchOriginRef.current.translateZ(-0.025);

                touchOriginRef.current.updateMatrixWorld(true);

                if (debug_touch && math.touchDebugArrow) {
                    const touchDir = new THREE.Vector3(0, 0, -1)
                        .applyQuaternion(touchOriginRef.current.quaternion)
                        .normalize();

                    math.touchDebugArrow.setDirection(touchDir);
                    math.touchDebugArrow.position.copy(
                        touchOriginRef.current.position
                    );
                }
            }
        }

        let targetCurl = 0;
        const isPointerHand = handedness !== (watch_hand || "left");

        // --- CHECK 1: PROXIMITY TO WATCH ---
        if (isPointerHand) {
            const watchSource = Array.from(session.inputSources).find(
                (s) => s.handedness === (watch_hand || "left")
            );

            if (watchSource && watchSource.gripSpace) {
                const myPose = xrFrame.getPose(
                    state.inputSource.gripSpace,
                    xr.getReferenceSpace()
                );
                const watchPose = xrFrame.getPose(
                    watchSource.gripSpace,
                    xr.getReferenceSpace()
                );

                if (myPose && watchPose) {
                    math.rayPos.set(
                        myPose.transform.position.x,
                        myPose.transform.position.y,
                        myPose.transform.position.z
                    );
                    math.watchPos.set(
                        watchPose.transform.position.x,
                        watchPose.transform.position.y,
                        watchPose.transform.position.z
                    );

                    if (math.rayPos.distanceTo(math.watchPos) < 0.3) {
                        targetCurl = 1.2; // approx 70 degrees of curl
                    }
                }
            }
        }

        // --- CHECK 2: POINTING AT THE BROWSER ---
        if (targetCurl === 0 && state.inputSource.targetRaySpace) {
            const rayPose = xrFrame.getPose(
                state.inputSource.targetRaySpace,
                xr.getReferenceSpace()
            );

            if (rayPose) {
                math.rayPos.set(
                    rayPose.transform.position.x,
                    rayPose.transform.position.y,
                    rayPose.transform.position.z
                );
                math.rayQuat.set(
                    rayPose.transform.orientation.x,
                    rayPose.transform.orientation.y,
                    rayPose.transform.orientation.z,
                    rayPose.transform.orientation.w
                );
                math.rayDir
                    .copy(math.fwdVector)
                    .applyQuaternion(math.rayQuat)
                    .normalize();

                math.raycaster.set(math.rayPos, math.rayDir);

                const mirrorMesh = rootState.scene.getObjectByName("DOMMirror");
                const watchMesh = rootState.scene.getObjectByName("WatchUI");

                const interactables: THREE.Object3D[] = [];
                if (mirrorMesh) interactables.push(mirrorMesh);
                if (watchMesh) interactables.push(watchMesh);

                if (interactables.length > 0) {
                    const hits = math.raycaster.intersectObjects(
                        interactables,
                        true
                    );
                    if (hits.length > 0) {
                        targetCurl = 1.2;

                        if (debug_ray_hit) {
                            const hit = hits[0];
                            const geometry = new THREE.SphereGeometry(0.005);
                            const material = new THREE.MeshBasicMaterial({
                                color: 0xff0000
                            });
                            const dot = new THREE.Mesh(geometry, material);
                            dot.position.copy(hit.point);
                            rootState.scene.add(dot);
                            setTimeout(() => rootState.scene.remove(dot), 100);
                        }
                    }
                }
            }
        }

        // --- SMOOTH THE CURL AMOUNT (frame-rate independent) ---
        // Tune the exponent's base to taste: smaller = snappier,
        // closer to 1 = lazier. This replaces the old
        // `bone.quaternion.slerp(bone.quaternion, lerpSpeed)` line, which
        // slerped a quaternion toward itself and did nothing — fingers
        // were actually snapping instantly every frame, not easing.
        const smoothing = 1 - Math.pow(0.0001, frameDelta);
        curlRef.current += (targetCurl - curlRef.current) * smoothing;
        const curl = curlRef.current;

        // --- FOLD MIDDLE / RING / PINKY VIA A REAL FK CHAIN ---
        Object.values(chainsRef.current).forEach((chain) => {
            math.cumulative.identity();

            chain.forEach(({ bone, bindQuat, bindQuatInverse, bindPos }, i) => {
                const curlAmount = -curl * (1 - i * 0.1);

                // This segment's own incremental bend, expressed in its
                // own bind-local frame (same convention as rotateX before).
                math.delta.setFromAxisAngle(X_AXIS, curlAmount);

                // World quaternion = (rotation inherited from earlier
                // segments in the chain) * (this bone's bind orientation)
                // * (this segment's own bend).
                bone.quaternion
                    .copy(math.cumulative)
                    .multiply(bindQuat)
                    .multiply(math.delta);

                if (i === 0) {
                    // Proximal is anchored at the knuckle — that joint
                    // itself doesn't translate, only rotates.
                    bone.position.copy(bindPos);
                } else {
                    // Carry this joint along using the REAL rest-pose
                    // distance to the previous joint (not a guessed fixed
                    // length), rotated by everything that happened
                    // upstream in the chain so far.
                    const prevBone = chain[i - 1].bone;
                    const prevBindPos = chain[i - 1].bindPos;
                    math.offset
                        .copy(bindPos)
                        .sub(prevBindPos)
                        .applyQuaternion(math.cumulative);
                    bone.position.copy(prevBone.position).add(math.offset);
                }

                // Fold this segment's own bend into the cumulative
                // world-space rotation before moving to the next bone in
                // the chain.
                math.localDeltaWorld
                    .copy(bindQuat)
                    .multiply(math.delta)
                    .multiply(bindQuatInverse);
                math.cumulative.multiply(math.localDeltaWorld);
            });
        });

        // --- FOLD THE THUMB ---
        // Same sibling-bone problem as the other fingers: thumb-phalanx-
        // distal doesn't move on its own when proximal rotates, so it
        // needs the same chain propagation, not a single isolated bone.
        const thumbChain = thumbChainRef.current;
        if (thumbChain) {
            // Tweak these if the thumb clips into the index finger.
            const thumbCurlX = -0.3;
            const thumbCurlZ = -0.2;

            // Scale with the same smoothed curl value so the thumb eases
            // in lockstep with the other fingers instead of snapping.
            const t = Math.min(Math.max(curl / 1.2, 0), 1);

            math.cumulative.identity();

            thumbChain.forEach(
                ({ bone, bindQuat, bindQuatInverse, bindPos }, i) => {
                    // Base joint (proximal) gets the sideways twist + most
                    // of the curl; the tip joint (distal) just adds a
                    // little extra hinge on top — keeps it from looking
                    // like a single rigid block.
                    math.delta.setFromAxisAngle(
                        X_AXIS,
                        i === 0 ? thumbCurlX * t : thumbCurlX * t * 0.6
                    );
                    if (i === 0) {
                        math.thumbGoal.setFromAxisAngle(Z_AXIS, thumbCurlZ * t);
                        math.delta.multiply(math.thumbGoal);
                    }

                    bone.quaternion
                        .copy(math.cumulative)
                        .multiply(bindQuat)
                        .multiply(math.delta);

                    if (i === 0) {
                        bone.position.copy(bindPos);
                    } else {
                        const prevBone = thumbChain[i - 1].bone;
                        const prevBindPos = thumbChain[i - 1].bindPos;
                        math.offset
                            .copy(bindPos)
                            .sub(prevBindPos)
                            .applyQuaternion(math.cumulative);
                        bone.position.copy(prevBone.position).add(math.offset);
                    }

                    math.localDeltaWorld
                        .copy(bindQuat)
                        .multiply(math.delta)
                        .multiply(bindQuatInverse);
                    math.cumulative.multiply(math.localDeltaWorld);
                }
            );
        }
    });

    return (
        <>
            <group rotation={[Math.PI / 2, 0, 0]} pointerEvents="none">
                <primitive object={handScene} />
            </group>

            <group ref={touchOriginRef} />

            {state.inputSource.targetRaySpace && (
                <XRSpace
                    ref={rayOriginRef}
                    space={state.inputSource.targetRaySpace}
                />
            )}

            {debug_touch && <primitive object={math.touchDebugArrow} />}

            <PointerRayModel pointer={rayPointer} />
            <PointerCursorModel pointer={rayPointer} />
        </>
    );
};
