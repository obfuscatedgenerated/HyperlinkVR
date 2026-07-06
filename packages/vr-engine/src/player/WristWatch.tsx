import { useSetting } from "@hyperlinkvr/react";
import { WATCH_UI_HEIGHT, WATCH_UI_WIDTH, WatchUI } from "@hyperlinkvr/watch-ui";
import { useFrame, useThree } from "@react-three/fiber";
import { Container } from "@react-three/uikit";
import { useMemo, useRef, useState } from "react";
import { Group, MathUtils, Matrix4, Quaternion, Vector3 } from "three";



import { useSessionMode } from "../contexts/SessionModeContext";
import { useHands } from "../input/hands";
import { useFlatInput } from "../input/impl/flat/bindings";


export type WatchMode = "wrist" | "presented" | "detached";

const OPEN_THRESHOLD = 0.85; // harder to open
const CLOSE_THRESHOLD = 0.7; // easier to keep open

const FORWARD = new Vector3(0, 0, -1);
const WORLD_UP = new Vector3(0, 1, 0);

const build_wrist_offset = (hand: "left" | "right") => {
    const rx = new Matrix4().makeRotationX(-Math.PI / 3);
    const rz = new Matrix4().makeRotationZ(
        hand === "left" ? Math.PI / 2 : -Math.PI / 2
    );
    const t = new Matrix4().makeTranslation(
        hand === "left" ? 0.02 : -0.02,
        0.055,
        -0.01
    );
    return new Matrix4().multiply(rx).multiply(rz).multiply(t);
};

interface WatchUIPresentationProps {
    mode: WatchMode;
    gaze_to_open?: boolean;
}

const WatchUIPresentation = ({ mode, gaze_to_open = false }: WatchUIPresentationProps) => {
    const watch_group_ref = useRef<Group>(null);
    const ui_group_ref = useRef<Group>(null);

    const [watch_hand] = useSetting("watch_hand");
    const hands = useHands();
    const { camera } = useThree();

    const [ui_open, set_ui_open] = useState(false);
    const wrist_offset = useMemo(() => build_wrist_offset(watch_hand), [watch_hand]);

    const scratch = useMemo(
        () => ({
            target_world: new Matrix4(),
            target_local: new Matrix4(),
            parent_inverse: new Matrix4(),
            target_pos: new Vector3(),
            target_quat: new Quaternion(),
            target_scale: new Vector3(1, 1, 1),
            camera_pos: new Vector3(),
            watch_pos: new Vector3(),
            watch_quat: new Quaternion(),
            watch_up: new Vector3(),
            dir_to_camera: new Vector3(),
            look_matrix: new Matrix4(),
            detached_pos: new Vector3(),
            detached_quat: new Quaternion(),
            detached_scale: 1.6
        }),
        []
    );

    const previous_mode = useRef<WatchMode>("wrist");

    useFrame(() => {
        const watch_group = watch_group_ref.current;
        const ui_group = ui_group_ref.current;
        if (!watch_group || !ui_group) return;

        let have_target = false;

        if (mode === "wrist") {
            const grip_node =
                (hands.find((hand) => hand.handedness === watch_hand) ?? hands[0])?.grip.current;
            if (grip_node) {
                grip_node.updateWorldMatrix(true, false);
                scratch.target_world.multiplyMatrices(grip_node.matrixWorld, wrist_offset);
                scratch.target_world.decompose(
                    scratch.target_pos,
                    scratch.target_quat,
                    scratch.target_scale
                );
                scratch.target_scale.setScalar(1);
                have_target = true;
            }
        } else if (mode === "presented") {
            camera.getWorldPosition(scratch.target_pos);
            camera.getWorldQuaternion(scratch.target_quat);
            scratch.target_pos.add(
                FORWARD.clone().applyQuaternion(scratch.target_quat).multiplyScalar(0.55)
            );
            scratch.look_matrix.lookAt(
                scratch.target_pos,
                camera.getWorldPosition(scratch.camera_pos),
                WORLD_UP
            );
            scratch.target_quat.setFromRotationMatrix(scratch.look_matrix);
            scratch.target_scale.setScalar(2.2);
            have_target = true;
        } else if (mode === "detached") {
            if (previous_mode.current !== "detached") {
                watch_group.getWorldPosition(scratch.detached_pos);
                watch_group.getWorldQuaternion(scratch.detached_quat);
            }
            scratch.target_pos.copy(scratch.detached_pos);
            scratch.target_quat.copy(scratch.detached_quat);
            scratch.target_scale.setScalar(scratch.detached_scale);
            have_target = true;
        }

        previous_mode.current = mode;
        if (!have_target) return;

        // convert the world-space target into the group's parent-local space
        scratch.target_world.compose(scratch.target_pos, scratch.target_quat, scratch.target_scale);
        if (watch_group.parent) {
            watch_group.parent.updateWorldMatrix(true, false);
            scratch.parent_inverse.copy(watch_group.parent.matrixWorld).invert();
            scratch.target_local.multiplyMatrices(scratch.parent_inverse, scratch.target_world);
        } else {
            scratch.target_local.copy(scratch.target_world);
        }
        scratch.target_local.decompose(
            watch_group.position,
            watch_group.quaternion,
            watch_group.scale
        );

        // ui open state
        let want_open: boolean;
        if (mode !== "wrist") {
            want_open = true;
        } else if (gaze_to_open) {
            camera.getWorldPosition(scratch.camera_pos);
            watch_group.getWorldPosition(scratch.watch_pos);
            watch_group.getWorldQuaternion(scratch.watch_quat);
            scratch.dir_to_camera.subVectors(scratch.camera_pos, scratch.watch_pos).normalize();
            scratch.watch_up.set(0, 1, 0).applyQuaternion(scratch.watch_quat);

            const facing_dot = scratch.dir_to_camera.dot(scratch.watch_up);
            const distance_to_camera = scratch.camera_pos.distanceTo(scratch.watch_pos);

            if (distance_to_camera < 0.6) {
                if (facing_dot > OPEN_THRESHOLD) want_open = true;
                else if (facing_dot < CLOSE_THRESHOLD) want_open = false;
                else want_open = ui_open;
            } else {
                want_open = false;
            }
        } else {
            want_open = false;
        }

        if (want_open !== ui_open) set_ui_open(want_open);

        // ui panel placement + open animation
        if (mode === "wrist") {
            ui_group.position.set(0, 0.05, -0.05);
            ui_group.rotation.set(
                -Math.PI / 2,
                0,
                watch_hand === "left" ? Math.PI / 2 : -Math.PI / 2
            );
        } else {
            ui_group.position.set(0, 0, 0.001);
            ui_group.rotation.set(0, 0, 0);
        }

        const open_scale = ui_open ? 1 : 0;
        ui_group.scale.setScalar(MathUtils.lerp(ui_group.scale.x, open_scale, 0.15));
    });

    return (
        <group ref={watch_group_ref}>
            <mesh>
                <boxGeometry args={[0.05, 0.01, 0.06]} />
                <meshStandardMaterial color="#222222" />
            </mesh>

            <group name="WatchUI" ref={ui_group_ref}>
                <Container
                    width={WATCH_UI_WIDTH}
                    height={WATCH_UI_HEIGHT}
                    pixelSize={0.3 / WATCH_UI_HEIGHT}
                    flexDirection="column"
                >
                    <WatchUI />
                </Container>
            </group>
        </group>
    );
};

export const FlatWatch = () => {
    const input = useFlatInput();
    return (
        <WatchUIPresentation
            mode={input.watch_presented ? "presented" : "wrist"}
            gaze_to_open={false}
        />
    );
};

export const VRWatch = () => {
    const [mode, setMode] = useState<WatchMode>("wrist");
    // TODO: vr button (or on the watch ui) to toggle between wrist and detached mode
    return <WatchUIPresentation mode={mode} gaze_to_open />;
};

export const WristWatch = () => {
    const session_mode = useSessionMode();
    return session_mode === "vr" ? <VRWatch /> : <FlatWatch />;
};
