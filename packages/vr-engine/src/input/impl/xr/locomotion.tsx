import {useXRControllerLocomotion, useXRInputSourceState, XRControllerState, XRSpace} from "@react-three/xr";
import {RefObject, useMemo, useRef} from "react";
import {Group, Quaternion, Vector3} from "three";
import {useSetting} from "@hyperlinkvr/react";
import {usePlayerOrigin} from "../../../contexts";
import {useRapier} from "@react-three/rapier";
import {createPortal, useFrame, useThree} from "@react-three/fiber";

const TELEPORT_STICK_FORWARD_THRESHOLD = 0.7;
const TELEPORT_STICK_RELEASE_THRESHOLD = 0.3;

const TELEPORT_MAX_DISTANCE = 5;
// TODO: teleport delay to enforce m/s, using a window to detect how far has been traveled with a second, reducing max distance if moving too fast

const TELEPORT_RAY_START_OFFSET = 0.2;

// how flat a surface must be to count as teleportable (1 = perfectly horizontal)
const TELEPORT_MIN_NORMAL_Y = 0.7;

// TODO: pull speed from common file to match flat and vr speed, then handle sprinting too

export const XRLocomotion = ({ origin }: { origin: RefObject<Group | null> }) => {
    const [locomotion] = useSetting("vr_locomotion");
    const [locomotion_hand] = useSetting("vr_locomotion_hand");
    const rotation_hand = useMemo(() => (locomotion_hand === "left" ? "right" : "left"), [locomotion_hand]);

    const [rotation] = useSetting("vr_rotation");
    const [snap_angle] = useSetting("vr_snap_rotation_angle");
    const [smooth_speed] = useSetting("vr_smooth_rotation_speed");
    const smooth_speed_rad = useMemo(() => smooth_speed * (Math.PI / 180), [smooth_speed]);

    // in teleport mode, explictly disable the translation, but keep rotation
    // teleportation is handled by TeleportSurface, not this component
    useXRControllerLocomotion(origin,
        {
            speed: locomotion === "walk" ? undefined : false
        },
        {
            // built in smooth rotation doesn't offset properly, so just disable snap angle when on smooth mode and implement our own
            type: "snap",
            degrees: rotation === "smooth" ? 0 : snap_angle,
        },
        locomotion_hand
    );

    // manual implementation of smooth turn
    const controller = useXRInputSourceState("controller", rotation_hand);
    const {camera} = useThree();

    const cam_local_pos = useMemo(() => new Vector3(), []);
    const rotated_cam_pos = useMemo(() => new Vector3(), []);
    const y_axis = useMemo(() => new Vector3(0, 1, 0), []);

    useFrame((_, delta) => {
        if (rotation !== "smooth" || !origin.current || !controller) return;

        const thumbstick = controller.gamepad["xr-standard-thumbstick"];
        if (!thumbstick) return;

        const turn_axis = thumbstick.xAxis ?? 0;

        // deadzone
        if (Math.abs(turn_axis) < 0.05) return;

        // clamp delta to prevent massive rotational jumps if a frame drops
        const safe_delta = Math.min(delta, 0.05);
        const angle = turn_axis * smooth_speed_rad * safe_delta * -1;

        cam_local_pos.copy(camera.position);
        cam_local_pos.y = 0;

        // pivot around camera position
        rotated_cam_pos.copy(cam_local_pos).applyAxisAngle(y_axis, angle);
        origin.current.position.add(cam_local_pos).sub(rotated_cam_pos);
        origin.current.rotation.y += angle;
    });

    return null;
};

// TODO: click stick to cancel teleport
// TODO: fix vignette for teleport with pulse

export const XRTeleportControl = ({
    input_source_state,
    enabled
}: {
    input_source_state: XRControllerState;
    enabled: boolean;
}) => {
    const origin = usePlayerOrigin();
    const { world, rapier } = useRapier();

    const ray_space_ref = useRef<Group>(null);
    const marker_ref = useRef<Group>(null);

    const was_aiming = useRef(false);
    const has_valid_target = useRef(false);

    const scratch = useMemo(
        () => ({
            ray_position: new Vector3(),
            ray_quaternion: new Quaternion(),
            ray_direction: new Vector3(),
            landing_point: new Vector3()
        }),
        []
    );

    const {scene} = useThree();

    useFrame(() => {
        const marker = marker_ref.current;
        const ray_space = ray_space_ref.current;

        if (!enabled || !ray_space) {
            if (marker) marker.visible = false;
            was_aiming.current = false;
            has_valid_target.current = false;
            return;
        }

        const thumbstick = input_source_state.gamepad?.["xr-standard-thumbstick"];
        const stick_y = thumbstick?.yAxis ?? 0;
        const aiming = was_aiming.current
            ? stick_y <= -TELEPORT_STICK_RELEASE_THRESHOLD
            : stick_y < -TELEPORT_STICK_FORWARD_THRESHOLD;
        const released = was_aiming.current && !aiming;

        if (aiming) {
            // ray from the controller's target-ray space, offset forward
            ray_space.updateWorldMatrix(true, false);
            ray_space.getWorldPosition(scratch.ray_position);
            ray_space.getWorldQuaternion(scratch.ray_quaternion);
            scratch.ray_direction
                .set(0, 0, -1)
                .applyQuaternion(scratch.ray_quaternion)
                .normalize();

            scratch.ray_position.addScaledVector(
                scratch.ray_direction,
                TELEPORT_RAY_START_OFFSET
            );

            const ray = new rapier.Ray(scratch.ray_position, scratch.ray_direction);
            const hit = world.castRayAndGetNormal(ray, TELEPORT_MAX_DISTANCE, true);

            const distance = (hit as any)?.timeOfImpact ?? (hit as any)?.toi;

            if (hit && distance !== undefined && hit.normal.y >= TELEPORT_MIN_NORMAL_Y) {
                const point = ray.pointAt(distance);
                scratch.landing_point.set(point.x, point.y, point.z);
                has_valid_target.current = true;
                if (marker) {
                    marker.position.copy(scratch.landing_point);
                    marker.visible = true;
                }
            } else {
                has_valid_target.current = false;
                if (marker) marker.visible = false;
            }
        } else if (marker) {
            marker.visible = false;
        }

        if (released && has_valid_target.current) {
            const origin_group = origin.current;
            if (origin_group) {
                origin_group.position.copy(scratch.landing_point);
            }
            has_valid_target.current = false;
        }

        was_aiming.current = aiming;
    });

    return (
        <>
            <XRSpace
                ref={ray_space_ref}
                space={input_source_state.inputSource.targetRaySpace}
            />

            {createPortal(
                <group ref={marker_ref} visible={false}>
                    <mesh rotation={[-Math.PI / 2, 0, 0]}>
                        <ringGeometry args={[0.2, 0.3, 32]} />
                        <meshBasicMaterial color={0x44ccff} transparent opacity={0.8} />
                    </mesh>
                </group>,
                scene
            )}
        </>
    );
};
