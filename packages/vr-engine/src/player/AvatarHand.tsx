import { useSetting } from "@hyperlinkvr/react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useTouchPointer, useXRInputSourceStateContext } from "@react-three/xr";
import { useEffect, useMemo, useRef } from "react";
import {
    ArrowHelper,
    Group,
    Mesh,
    MeshBasicMaterial,
    Object3D,
    Quaternion,
    SphereGeometry,
    Vector3
} from "three";

import { useAvatarMaterials } from "../contexts/AvatarContext";
import { Hand, useHands } from "../input/hands";
import { LayerGroup } from "../render/LayerGroup";
import { Layer } from "../render/layers";


const left_hand = new URL("../../assets/player/hands/left.glb", import.meta.url).href;
const right_hand = new URL("../../assets/player/hands/right.glb", import.meta.url).href;

const FINGER_NAMES = ["middle", "ring", "pinky"];
const SEGMENT_NAMES = ["proximal", "intermediate", "distal"];
const X_AXIS = new Vector3(1, 0, 0);
const Z_AXIS = new Vector3(0, 0, 1);

interface ChainLink {
    bone: Object3D;
    bindQuat: Quaternion;
    bindQuatInverse: Quaternion;
    bindPos: Vector3;
}

// TODO: disable ray when touch has a hit
// TODO: prevent double touch when passing through watch

const pose_to_curl = (p: Hand["pose"]["current"]): number => {
    if (p.kind === "curl") return p.amount;
    return p.name === "fist" ? 1.2 : 0;
};

const TOUCH_HOVER_RADIUS = 0.04;
const TOUCH_DOWN_RADIUS = 0.01;

export const AvatarHand = () => {
    const state = useXRInputSourceStateContext("controller");
    const handedness = state.inputSource.handedness;

    const hands = useHands();

    const { scene: hand_scene } = useGLTF(
        handedness === "left" ? left_hand : right_hand
    );
    useAvatarMaterials(hand_scene);

    const touchOriginRef = useRef<Group>(null);
    useTouchPointer(touchOriginRef, state, {
        hoverRadius: TOUCH_HOVER_RADIUS,
        downRadius: TOUCH_DOWN_RADIUS
    });

    const [debug_touch] = useSetting("debug_touch");

    const curlRef = useRef(0);
    const chainsRef = useRef<Record<string, ChainLink[]> | null>(null);
    const thumbChainRef = useRef<ChainLink[] | null>(null);

    // bind-pose capture + FK chain build
    useEffect(() => {
        if (!hand_scene) return;

        hand_scene.traverse((node: any) => {
            if (node.isBone && !node.userData.initialQuaternion) {
                node.userData.initialQuaternion = node.quaternion.clone();
                node.userData.initialPosition = node.position.clone();
            }
        });
        const chains: Record<string, ChainLink[]> = {};
        FINGER_NAMES.forEach((finger) => {
            const bones = SEGMENT_NAMES.map((seg) =>
                hand_scene.getObjectByName(`${finger}-finger-phalanx-${seg}`)
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
            hand_scene.getObjectByName(`thumb-phalanx-${seg}`)
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
    }, [hand_scene]);

    const math = useMemo(
        () => ({
            rayPos: new Vector3(),
            rayQuat: new Quaternion(),
            delta: new Quaternion(),
            localDeltaWorld: new Quaternion(),
            cumulative: new Quaternion(),
            offset: new Vector3(),
            thumbGoal: new Quaternion(),
            touchDebugArrow: new ArrowHelper(
                      new Vector3(0, 0, -1), // default forward
                      new Vector3(),
                      0.05,
                      0x00ff00 // green
            ),
            touchDebugHoverSphere: (() => {
                const geometry = new SphereGeometry(TOUCH_HOVER_RADIUS, 16, 16);
                const material = new MeshBasicMaterial({
                    color: 0xff00ff,
                    wireframe: true,
                    transparent: true,
                    opacity: 0.5
                });
                return new Mesh(geometry, material);
            })(),
            touchDebugDownSphere: (() => {
                const geometry = new SphereGeometry(TOUCH_DOWN_RADIUS, 16, 16);
                const material = new MeshBasicMaterial({
                    color: 0x00ffff,
                    wireframe: true,
                    transparent: true,
                    opacity: 0.5
                });
                return new Mesh(geometry, material);
            })()
        }),
        []
    );

    useFrame(() => {
        if (!hand_scene || !chainsRef.current) return;

        const hand = hands.find((h) => h.handedness === handedness) ?? null;

        // glue the touch ray to the fingertip
        if (touchOriginRef.current && touchOriginRef.current.parent) {
            const indexTipBone = hand_scene.getObjectByName(
                "index-finger-phalanx-distal"
            );
            if (indexTipBone) {
                indexTipBone.getWorldPosition(math.rayPos);
                indexTipBone.getWorldQuaternion(math.rayQuat);
                touchOriginRef.current.parent.worldToLocal(math.rayPos);
                touchOriginRef.current.parent.getWorldQuaternion(
                    math.cumulative
                );
                math.rayQuat.premultiply(math.cumulative.invert());
                touchOriginRef.current.position.copy(math.rayPos);
                touchOriginRef.current.quaternion.copy(math.rayQuat);
                touchOriginRef.current.translateZ(-0.015);
                touchOriginRef.current.updateMatrixWorld(true);

                if (debug_touch) {
                    const touch_direction = new Vector3(0, 0, -1)
                        .applyQuaternion(touchOriginRef.current.quaternion)
                        .normalize();

                    math.touchDebugArrow.setDirection(touch_direction);
                    math.touchDebugArrow.position.copy(
                        touchOriginRef.current.position
                    );

                    math.touchDebugHoverSphere.position.copy(
                        touchOriginRef.current.position
                    );
                    math.touchDebugDownSphere.position.copy(
                        touchOriginRef.current.position
                    );
                }
            }
        }

        // curl comes from hand pose, but smoothed to animate
        const target = hand ? pose_to_curl(hand.pose.current) : 0;
        const smoothing = 1 - Math.pow(0.0001, 0.016);
        curlRef.current += (target - curlRef.current) * smoothing;
        const curl = curlRef.current;

        // fold fingers
        Object.values(chainsRef.current).forEach((chain) => {
            math.cumulative.identity();
            chain.forEach(({ bone, bindQuat, bindQuatInverse, bindPos }, i) => {
                math.delta.setFromAxisAngle(X_AXIS, -curl * (1 - i * 0.1));
                bone.quaternion
                    .copy(math.cumulative)
                    .multiply(bindQuat)
                    .multiply(math.delta);
                if (i === 0) bone.position.copy(bindPos);
                else {
                    const prevBone = chain[i - 1].bone,
                        prevBindPos = chain[i - 1].bindPos;
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
            });
        });

        // fold thumb
        const thumbChain = thumbChainRef.current;
        if (thumbChain) {
            const thumbCurlX = -0.3,
                thumbCurlZ = -0.2;
            const t = Math.min(Math.max(curl / 1.2, 0), 1);
            math.cumulative.identity();
            thumbChain.forEach(
                ({ bone, bindQuat, bindQuatInverse, bindPos }, i) => {
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
                    if (i === 0) bone.position.copy(bindPos);
                    else {
                        const prevBone = thumbChain[i - 1].bone,
                            prevBindPos = thumbChain[i - 1].bindPos;
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
        <LayerGroup layers={[Layer.PlayerModel_TorsoAndHands]}>
            <group rotation={[Math.PI / 2, 0, 0]} pointerEvents="none">
                <primitive object={hand_scene} />
            </group>
            <group ref={touchOriginRef} />
            {debug_touch && (
                // TODO: make one group, but doesnt really matter
                <>
                    <primitive object={math.touchDebugArrow} />
                    <primitive object={math.touchDebugHoverSphere} />
                    <primitive object={math.touchDebugDownSphere} />
                </>
            )}
        </LayerGroup>
    );
};
