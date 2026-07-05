import { useXRControllerLocomotion, XROrigin } from "@react-three/xr";
import { useImperativeHandle, useRef } from "react";
import { Group } from "three";

import { Text } from "@react-three/drei";

import {
    ExpressionMouth,
    PlayerExpressionProvider,
    usePlayerExpression
} from "../contexts/PlayerExpressionContext";
import { Avatar } from "./Avatar";
import { WristWatch } from "./WristWatch";
import { useSetting } from "@hyperlinkvr/react";


const MouthTest = ({mouth_name, position}: {mouth_name: ExpressionMouth, position: [number, number, number]}) => {
    const { set_mouth } = usePlayerExpression();

    return (
        <group name="MouthTest" position={position} onClick={() => set_mouth(mouth_name)}>
            <mesh
                name="MouthTestPlane"
            >
                <planeGeometry args={[0.3, 0.3]} />
                <meshBasicMaterial
                    color="white"
                    transparent
                    opacity={0.5}
                    side={2}
                />
            </mesh>

            <Text
                name="MouthTestText"
                position={[0, 0, 0.01]}
                fontSize={0.05}
                color="black"
                anchorX="center"
                anchorY="middle"
            >
                {mouth_name}
            </Text>
        </group>
    );
}

export const Player = ({ref = null}: {ref?: React.Ref<Group>}) => {
    const origin_ref = useRef<Group>(null);
    useImperativeHandle(ref, () => origin_ref.current!);
    
    useXRControllerLocomotion(origin_ref);

    const [show_expression_test] = useSetting("debug_show_expression_ui");

    return (
        <group name="Player">
            <PlayerExpressionProvider>
                <XROrigin ref={origin_ref}>
                    <WristWatch />

                    <group name="ExpressionTest" visible={show_expression_test}>
                        <Text
                            position={[0, 2, -1]}
                            fontSize={0.1}
                            color="white"
                            anchorX="center"
                            anchorY="middle"
                        >
                            Mouth Expression Test
                        </Text>
                        <MouthTest mouth_name="default" position={[-0.5, 1.5, -1]} />
                        <MouthTest mouth_name="big_smile" position={[0, 1.5, -1]} />
                        <MouthTest mouth_name="wobbly_frown" position={[0.5, 1.5, -1]} />
                    </group>
                </XROrigin>

                <Avatar />
            </PlayerExpressionProvider>
        </group>
    );
}
