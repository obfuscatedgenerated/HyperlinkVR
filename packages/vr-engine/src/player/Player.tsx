import { useSetting } from "@hyperlinkvr/react";
import { Text } from "@react-three/drei";
import { XROrigin } from "@react-three/xr";
import {useEffect, useImperativeHandle, useRef} from "react";
import { Group } from "three";

import {
    ExpressionMouth,
    PlayerExpressionProvider,
    usePlayerExpression
} from "../contexts/PlayerExpressionContext";
import { useSessionMode } from "../contexts/SessionModeContext";
import { FlatLocomotion } from "../input/impl/flat/locomotion";
import { XRLocomotion } from "../input/impl/xr/locomotion";
import { Avatar } from "./Avatar";
import { FlatCameraRig } from "./FlatCameraRig";
import { WristWatch } from "./WristWatch";
import { XRHandsPublisher } from "../input/impl/xr/hands";
import { FlatHandsPublisher } from "../input/impl/flat/hands";
import {ComfortVignette} from "./ComfortVignette";
import {PlayerGravity} from "./PlayerGravity";
import {useWebSDKMessaging} from "../contexts";
import {EULER_ORDER} from "../consts";

const MouthTest = ({
    mouth_name,
    position
}: {
    mouth_name: ExpressionMouth;
    position: [number, number, number];
}) => {
    const { set_mouth } = usePlayerExpression();

    return (
        <group
            name="MouthTest"
            position={position}
            onClick={() => set_mouth(mouth_name)}>
            <mesh name="MouthTestPlane">
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
                anchorY="middle">
                {mouth_name}
            </Text>
        </group>
    );
};

const ExpressionTest = () => {
    const [show_expression_test] = useSetting("debug_show_expression_ui");

    if (!show_expression_test) {
        return null;
    }

    return (
        <group name="ExpressionTest">
            <Text
                position={[0, 2, -1]}
                fontSize={0.1}
                color="white"
                anchorX="center"
                anchorY="middle">
                Mouth Expression Test
            </Text>
            <MouthTest mouth_name="default" position={[-0.5, 1.5, -1]} />
            <MouthTest mouth_name="big_smile" position={[0, 1.5, -1]} />
            <MouthTest mouth_name="wobbly_frown" position={[0.5, 1.5, -1]} />
        </group>
    );
};

export const Player = ({ ref = null }: { ref?: React.Ref<Group> }) => {
    const origin_ref = useRef<Group>(null);
    useImperativeHandle(ref, () => origin_ref.current!);

    const session_mode = useSessionMode();

    const {on_action} = useWebSDKMessaging();
    useEffect(() => {
        // TODO: these ignore target username on the message and assume its for us, nothing to do rn but just remember this is the case when multiplayer happens

        const unlisten_get_pos = on_action("HVRSDK_PLAYER_GET_POSITION", (message, reply) => {
            if (!origin_ref.current) {
                reply({
                    for: "HVRSDK_PLAYER_GET_POSITION",
                    // TODO: error envelope!
                    error: "Player origin not available"
                });
                return;
            }

            const pos = origin_ref.current.position;
            const euler = origin_ref.current.rotation;
            reply({
                for: "HVRSDK_PLAYER_GET_POSITION",
                position: [pos.x, pos.y, pos.z],
                facing: [euler.x, euler.y, euler.z] // as euler XYZ
            });
        });

        const unlisten_teleport_to = on_action("HVRSDK_PLAYER_TELEPORT_TO", (message, reply) => {
            if (!origin_ref.current) {
                reply({
                    for: "HVRSDK_PLAYER_TELEPORT_TO",
                    error: "Player origin not available"
                });
                return;
            }

            // TODO: optional (maybe default) fade out and in, will at least do vignette for now but would help to have them differentiate between teleporting and lag!
            const pos = message.position;
            const facing = message.facing;

            if (pos) {
                origin_ref.current.position.set(pos[0], pos[1], pos[2]);
            }

            if (facing) {
                // as euler XYZ
                origin_ref.current.rotation.set(facing[0], facing[1], facing[2], EULER_ORDER);
            }

            const new_pos = origin_ref.current.position;
            const new_euler = origin_ref.current.rotation;

            reply({
                for: "HVRSDK_PLAYER_TELEPORT_TO",
                new_position: [new_pos.x, new_pos.y, new_pos.z],
                new_facing: [new_euler.x, new_euler.y, new_euler.z] // as euler XYZ
            });
        });

        // TODO: rotating origin doesnt rotate camera/vr player! so facing doesnt work currently

        return () => {
            unlisten_get_pos();
            unlisten_teleport_to();
        }
    }, []);

    return (
        <group name="Player">
            <PlayerExpressionProvider>
                <Avatar />
                <WristWatch />

                <PlayerGravity />

                {session_mode === "vr" ? (
                    <>
                        <ComfortVignette />
                        <XROrigin ref={origin_ref}>
                            <XRHandsPublisher />
                            <ExpressionTest />
                        </XROrigin>
                        <XRLocomotion origin={origin_ref} />
                    </>
                ) : (
                    <>
                        <group ref={origin_ref} name="FlatOrigin">
                            <FlatHandsPublisher />
                            <FlatCameraRig origin={origin_ref} />
                            <ExpressionTest />
                        </group>
                        <FlatLocomotion origin={origin_ref} />
                    </>
                )}
            </PlayerExpressionProvider>
        </group>
    );
};
