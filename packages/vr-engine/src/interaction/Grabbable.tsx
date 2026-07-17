import type { GrabCollider } from "@hyperlinkvr/vr-engine-schemas";
import { useFrame } from "@react-three/fiber";
import type { RapierRigidBody } from "@react-three/rapier";
import { ComponentProps, RefObject, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { BackSide, Box3, Group, Matrix4, Mesh, MeshBasicMaterial, Object3D, Quaternion, Raycaster, Sphere, Vector3 } from "three";

import { useObjectRefsOptional } from "../contexts";
import { PLAYER_FILTER_BIT, PLAYER_IGNORE_RELEASE_DELAY_S } from "../engine/collision_groups";
import { Hand, useHands } from "../input/hands";
import {FULL_THROW_CHARGE_S} from "../input/values";

enum RigidBodyType {
    Fixed = 1,
    Dynamic = 0,
    KinematicPositionBased = 2,
    KinematicVelocityBased = 3
}

const DEFAULT_FLAT_MIN_THROW_SPEED = 3; // m/s, a tap of the throw key
const DEFAULT_MAX_THROW_SPEED = 18; // m/s, full charge
const RELEASE_HEADROOM_MULT = 1.2; // the player can throw a touch faster than max throw speed if locomoting
const MAX_INHERITED_SPEED = 8; // cap on carry-slot velocity combined into a flat throw
const VR_THROW_BOOST = 1.5; // vr tracking can undersell how fast the hand is moving, so boost the throw a bit

const excluded_from_bounds = (o: Object3D): boolean => {
    let cur: Object3D | null = o;
    while (cur) {
        if (
            cur.userData._is_outline_effect ||
            cur.userData._exclude_from_bounds // TODO: expose this flag in some way to the sdk when object parenting is introduced
        )
            return true;
        cur = cur.parent;
    }
    return false;
};

export const useOutlineEffect = (
    target_ref: RefObject<Object3D | null>,
    enabled: boolean,
    color = 0x87ed87
) => {
    useEffect(() => {
        const target = target_ref.current;
        if (!target || !enabled) return;

        // 1. Collect all valid meshes into an array first
        const meshes: Mesh[] = [];
        target.traverse((child) => {
            if ((child as Mesh).isMesh && !excluded_from_bounds(child)) {
                meshes.push(child as Mesh);
            }
        });

        // 2. Add outlines to the collected meshes
        meshes.forEach((mesh) => {
            const outline = new Mesh(
                mesh.geometry,
                new MeshBasicMaterial({
                    color: color,
                    side: BackSide
                })
            );

            outline.scale.setScalar(1.05);
            outline.userData._is_outline_effect = true;

            mesh.add(outline);

            // inherit layers from the mesh TODO: should it add a custom outline layer?
            outline.layers.mask = mesh.layers.mask;
        });

        return () => {
            if (!target) return;

            // 3. Remove in a clean pass
            target.traverse((child) => {
                const outlines = child.children.filter(
                    (c) => c.userData._is_outline_effect
                );
                outlines.forEach((outline) => child.remove(outline));
            });
        };
    }, [enabled, color, target_ref]);
};

// takes a hand position already converted to the object's local space,
// returns distance to the grab region (0 when inside)
type RegionTester = (localHand: Vector3) => number;

const distance_from_point_to_segment = (() => {
    const ab = new Vector3();
    const ap = new Vector3();
    const proj = new Vector3();
    return (p: Vector3, a: Vector3, b: Vector3): number => {
        ab.copy(b).sub(a);
        const lenSq = ab.lengthSq();
        const t = lenSq > 0 ? Math.min(1, Math.max(0, ap.copy(p).sub(a).dot(ab) / lenSq)) : 0;
        proj.copy(a).addScaledVector(ab, t);
        return p.distanceTo(proj);
    };
})();

// oriented bounding box from the object's mesh geometry, in local space
const compute_local_bounds = (target: Object3D): Box3 | null => {
    const box = new Box3();
    target.updateWorldMatrix(true, true);
    const inv = new Matrix4().copy(target.matrixWorld).invert();
    const childToLocal = new Matrix4();
    const childBox = new Box3();

    target.traverse((child) => {
        const mesh = child as Mesh;
        if (!mesh.isMesh || excluded_from_bounds(child)) return;
        if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
        if (!mesh.geometry.boundingBox) return;
        childBox.copy(mesh.geometry.boundingBox);
        childToLocal.multiplyMatrices(inv, mesh.matrixWorld);
        childBox.applyMatrix4(childToLocal);
        box.union(childBox);
    });

    return box.isEmpty() ? null : box; // empty until the GLTF geometry has loaded
};

const bounding_box_tester = (target: Object3D): RegionTester | null => {
    const box = compute_local_bounds(target);
    if (!box) return null;
    return (p) => box.distanceToPoint(p);
};

const bounding_sphere_tester = (target: Object3D): RegionTester | null => {
    const box = compute_local_bounds(target);
    if (!box) return null;
    const sphere = box.getBoundingSphere(new Sphere());
    const center = sphere.center.clone();
    const radius = sphere.radius;
    return (p) => Math.max(0, p.distanceTo(center) - radius);
};

const build_region_tester = (collider: GrabCollider | undefined, target: Object3D): RegionTester | null => {
    if (!collider) return bounding_box_tester(target);

    switch (collider.type) {
        case "box": {
            const [size_x, size_y, size_z] = collider.size; // full size
            const box = new Box3(
                new Vector3(-size_x / 2, -size_y / 2, -size_z / 2),
                new Vector3(size_x / 2, size_y / 2, size_z / 2)
            );
            return (p) => box.distanceToPoint(p);
        }
        case "sphere": {
            const radius = collider.radius;
            return (p) => Math.max(0, p.length() - radius); // centered at origin
        }
        case "capsule": {
            const radius = collider.radius;
            const segment_half = Math.max(0, collider.height / 2 - radius); // full-height assumption
            const cap_a = new Vector3(0, -segment_half, 0);
            const cap_b = new Vector3(0, segment_half, 0);
            return (p) => Math.max(0, distance_from_point_to_segment(p, cap_a, cap_b) - radius);
        }
        case "auto-bounding-box": {
            return bounding_box_tester(target);
        }
        case "auto-bounding-sphere": {
            return bounding_sphere_tester(target);
        }
        default:
            console.warn(`Unhandled collider`, collider);
            return null;
    }
};

const _rc = new Raycaster();
const _ro = new Vector3();
const _rd = new Vector3();
const _rq = new Quaternion();
const FWD = new Vector3(0, 0, -1);
const WORLD_UP = new Vector3(0, 1, 0);

const ray_hits_within = (
    rayNode: Object3D | null,
    target: Object3D,
    reach: number
): boolean => {
    if (!rayNode) return false;
    rayNode.updateWorldMatrix(true, false);
    _ro.setFromMatrixPosition(rayNode.matrixWorld);
    _rd.copy(FWD).applyQuaternion(rayNode.getWorldQuaternion(_rq)).normalize();
    _rc.set(_ro, _rd);
    _rc.far = reach;
    return _rc.intersectObject(target, true).length > 0;
};

export const useGrabbable = (
    target_ref: RefObject<Object3D | null>,
    {
        grab_distance = 1,
        nearby_trigger_distance = 1,
        reach = 0, // 0 = ray-grab disabled (VR default), flat sets this to a distance
        snap_to_hand = true,
        snap_grab_offset,
        // "grip": offset in raw WebXR grip-space axes (tilts with the wrist).
        // "aim":  offset as [right, up, forward] built from the ray/pointer
        //         direction and world-up, positioned at the grip. Intuitive,
        //         wrist-independent. Only applies to snap/ray grabs.
        snap_grab_offset_space = "aim",
        ignore_player_while_held = true,
        player_ignore_release_delay = PLAYER_IGNORE_RELEASE_DELAY_S,
        collider,
        on_grab_start,
        on_grab_end,
        on_nearby_start,
        on_nearby_end,
        on_trigger_start,
        on_trigger_end,
        flat_throwable = true, // false only prevents using the throw button on flat mode (ui hint). we cant stop vr players throwing. use max_throw_speed = 0 to make it slip out their hand instead
        min_flat_throw_speed = DEFAULT_FLAT_MIN_THROW_SPEED,
        max_throw_speed = DEFAULT_MAX_THROW_SPEED
    }: {
        grab_distance?: number;
        nearby_trigger_distance?: number;
        reach?: number;
        snap_to_hand?: boolean;
        snap_grab_offset?: [number, number, number];
        snap_grab_offset_space?: "grip" | "aim";
        ignore_player_while_held?: boolean;
        player_ignore_release_delay?: number;
        collider?: GrabCollider;
        on_grab_start?: (hand: Hand) => void;
        on_grab_end?: (hand: Hand) => void;
        on_nearby_start?: (hand: Hand) => void;
        on_nearby_end?: (hand: Hand) => void;
        on_trigger_start?: (hand: Hand) => void;
        on_trigger_end?: (hand: Hand | null) => void;
        flat_throwable?: boolean;
        min_flat_throw_speed?: number;
        max_throw_speed?: number;
    } = {}
) => {
    const hands = useHands();
    const body_ref = useObjectRefsOptional()?.rigid_body ?? null;

    const grabbingHand = useRef<Hand | null>(null);
    const offsetMatrix = useRef(new Matrix4());
    const tempMatrix = useRef(new Matrix4());
    const grabbedHandMatrix = useRef(new Matrix4()); // snapshot of the grabbing hand, isolated from the per-hand scratch matrix
    const snapped_grab = useRef(false); // true when this grab used a carry slot (snap/ray) vs a captured relative pose
    const nearbyHands = useRef(new Set<Hand>());

    const prevGrabPos = useRef(new Vector3());
    const grabVelocity = useRef(new Vector3());

    const parentInverse = useRef(new Matrix4());
    const _p = useRef(new Vector3());
    const _q = useRef(new Quaternion());
    const _s = useRef(new Vector3());
    const _objPos = useRef(new Vector3());
    const _localHand = useRef(new Vector3());

    // scratch for the "aim" offset frame
    const grip_world_pos = useRef(new Vector3());
    const grip_world_quat = useRef(new Quaternion());
    const grip_scratch_scale = useRef(new Vector3());
    const ray_world_quat = useRef(new Quaternion());
    const aim_forward = useRef(new Vector3());
    const aim_right = useRef(new Vector3());
    const aim_up = useRef(new Vector3());
    const aim_displacement = useRef(new Vector3());
    const unit_scale = useRef(new Vector3(1, 1, 1));

    const throw_dir_quat = useRef(new Quaternion());
    const throw_velocity = useRef(new Vector3());
    const inherited_velocity = useRef(new Vector3());
    // hands that threw and must fully release grab before re-grabbing, otherwise a still-held RMB instantly re-grabs the object it just threw
    const throw_lockout = useRef(new Set<Hand>());

    const region_tester = useRef<RegionTester | null>(null);
    const region_source = useRef<GrabCollider | undefined>(undefined);
    const ensure_region_tester = (target: Object3D): RegionTester | null => {
        if (region_tester.current && region_source.current === collider)
            return region_tester.current;
        const tester = build_region_tester(collider, target);
        if (tester) {
            region_tester.current = tester;
            region_source.current = collider;
        }
        return region_tester.current;
    };

    const is_trigger_held = useRef(false);

    // ---- player-collision ignore (so a held object can't be batted by the
    // ---- owner's own hands/head/torso), with a falling-edge restore delay ----
    const player_ignored = useRef(false);
    const saved_collision_groups = useRef<number[] | null>(null);
    const restore_countdown = useRef<number | null>(null); // null = no pending restore

    const apply_player_ignore = (body: RapierRigidBody | null) => {
        if (!body || !ignore_player_while_held || player_ignored.current) return;
        const collider_count = body.numColliders();
        const saved: number[] = [];
        for (let index = 0; index < collider_count; index++) {
            const body_collider = body.collider(index);
            const original = body_collider.collisionGroups();
            saved.push(original);
            body_collider.setCollisionGroups(original & ~PLAYER_FILTER_BIT);
        }
        saved_collision_groups.current = saved;
        player_ignored.current = true;
    };

    const restore_player_collision = (body: RapierRigidBody | null) => {
        if (!body || !player_ignored.current) return;
        const saved = saved_collision_groups.current;
        if (saved) {
            const collider_count = body.numColliders();
            for (let index = 0; index < collider_count && index < saved.length; index++) {
                body.collider(index).setCollisionGroups(saved[index]);
            }
        }
        saved_collision_groups.current = null;
        player_ignored.current = false;
    };

    const release_held = (
        hand: Hand,
        body: RapierRigidBody | null,
        velocity: Vector3
    ) => {
        grabbingHand.current = null;
        on_grab_end?.(hand);

        if (hand.throw_intent) {
            hand.throw_intent.held_throwable.current = null;
        }

        if (body) {
            body.setBodyType(RigidBodyType.Dynamic, true);
            // mutates the caller's vector, grabVelocity resets on the next grab and throw_velocity is per-throw scratch
            velocity.clampLength(0, max_throw_speed * RELEASE_HEADROOM_MULT);
            body.setLinvel({ x: velocity.x, y: velocity.y, z: velocity.z }, true);
        }

        // keep ignoring the player briefly so the receding hand can't bat the object as it turns dynamic again
        if (player_ignored.current) {
            restore_countdown.current = player_ignore_release_delay;
        }
    };

    // builds the world matrix for a snapped grab whose offset is expressed in
    // the aim frame: forward = pointer direction, up = world up, right = their
    // cross. grab_offset reads as [right, up, forward]. writes into out_matrix.
    const compose_aim_world_matrix = (
        hand: Hand,
        hand_world_matrix: Matrix4,
        offset: [number, number, number],
        out_matrix: Matrix4
    ): Matrix4 => {
        hand_world_matrix.decompose(
            grip_world_pos.current,
            grip_world_quat.current,
            grip_scratch_scale.current
        );

        const rayNode = hand.ray.current;
        if (rayNode) {
            rayNode.updateWorldMatrix(true, false);
            rayNode.getWorldQuaternion(ray_world_quat.current);
            aim_forward.current.copy(FWD).applyQuaternion(ray_world_quat.current).normalize();
        } else {
            // no pointer: fall back to the grip's own forward
            aim_forward.current.copy(FWD).applyQuaternion(grip_world_quat.current).normalize();
        }

        aim_right.current.crossVectors(aim_forward.current, WORLD_UP);
        if (aim_right.current.lengthSq() < 1e-6) {
            // pointing near straight up/down: derive right from the grip instead
            aim_right.current.set(1, 0, 0).applyQuaternion(grip_world_quat.current);
        }
        aim_right.current.normalize();
        aim_up.current.crossVectors(aim_right.current, aim_forward.current).normalize();
        // re-orthonormalise right so the three axes are exactly perpendicular
        aim_right.current.crossVectors(aim_forward.current, aim_up.current).normalize();

        const [offset_right, offset_up, offset_forward] = offset;
        aim_displacement.current
            .set(0, 0, 0)
            .addScaledVector(aim_right.current, offset_right)
            .addScaledVector(aim_up.current, offset_up)
            .addScaledVector(aim_forward.current, offset_forward);

        grip_world_pos.current.add(aim_displacement.current);

        // keep the object's orientation matched to the grip (irrelevant for balls)
        return out_matrix.compose(
            grip_world_pos.current,
            grip_world_quat.current,
            unit_scale.current
        );
    };

    useFrame((_state, delta) => {
        if (!target_ref.current) return;
        target_ref.current.updateWorldMatrix(true, false);

        const body = body_ref?.current ?? null;
        const region = ensure_region_tester(target_ref.current);
        const currentlyNear = new Set<Hand>();
        let activeHandMatrix: Matrix4 | null = null;

        const objPos = _objPos.current.setFromMatrixPosition(
            target_ref.current.matrixWorld
        );

        for (const hand of hands) {
            const gripObj = hand.grip.current;
            if (!gripObj) continue;

            if (!hand.grab.pressed) throw_lockout.current.delete(hand);

            gripObj.updateWorldMatrix(true, false);

            const handMatrix = tempMatrix.current.copy(gripObj.matrixWorld); // already world-space
            const handPos = _p.current.setFromMatrixPosition(handMatrix);

            let distance: number;
            if (region) {
                _localHand.current.copy(handPos);
                target_ref.current.worldToLocal(_localHand.current);
                distance = region(_localHand.current);
            } else {
                distance = handPos.distanceTo(objPos);
            }

            if (distance < nearby_trigger_distance) {
                currentlyNear.add(hand);
                if (!nearbyHands.current.has(hand)) on_nearby_start?.(hand);
            }

            const proximity_ok = distance < grab_distance;
            const ray_ok =
                hand.grab.just_pressed &&
                reach > 0 &&
                ray_hits_within(hand.ray.current, target_ref.current, reach);

            if (
                hand.grab.pressed &&
                !grabbingHand.current &&
                !throw_lockout.current.has(hand) &&
                (proximity_ok || ray_ok)
            ) {
                const use_carry_slot = ray_ok || snap_to_hand;
                snapped_grab.current = use_carry_slot;

                if (use_carry_slot) {
                    // grip-space offset is baked here; aim-space offset is
                    // recomputed per frame in the move tail (needs live pointer)
                    if (snap_grab_offset && snap_grab_offset_space === "grip") {
                        offsetMatrix.current.makeTranslation(
                            snap_grab_offset[0],
                            snap_grab_offset[1],
                            snap_grab_offset[2]
                        );
                    } else {
                        offsetMatrix.current.identity();
                    }
                } else {
                    offsetMatrix.current.multiplyMatrices(
                        // keep captured relative pose (VR touch)
                        handMatrix.clone().invert(),
                        target_ref.current.matrixWorld
                    );
                }
                grabbingHand.current = hand;
                on_grab_start?.(hand);

                // tell the flat input system whether i want to be thrown
                if (hand.throw_intent) {
                    hand.throw_intent.held_throwable.current = flat_throwable;
                }

                prevGrabPos.current.copy(objPos);
                grabVelocity.current.set(0, 0, 0);
                body?.setBodyType(RigidBodyType.KinematicPositionBased, true);

                // stop colliding with the player while held, and cancel any pending restore from a previous quick release
                apply_player_ignore(body);
                restore_countdown.current = null;
            } else if (!hand.grab.pressed && grabbingHand.current === hand) {
                // boost for vr throws only (which dont use the intent system)
                release_held(hand, body, hand.throw_intent ? grabVelocity.current : grabVelocity.current.multiplyScalar(VR_THROW_BOOST));
            }

            if (grabbingHand.current === hand) {
                // copy into its own storage so later loop iterations overwriting tempMatrix can't corrupt the grabber
                activeHandMatrix = grabbedHandMatrix.current.copy(handMatrix);
                if (hand.trigger.just_pressed) {
                    is_trigger_held.current = true;
                    on_trigger_start?.(hand);
                } else if (hand.trigger.just_released) {
                    is_trigger_held.current = false;
                    on_trigger_end?.(hand);
                }

                const throw_intent = hand.throw_intent;
                if (flat_throwable && throw_intent?.button.just_released) {
                    const normalized = Math.min(
                        throw_intent.charge_seconds.current / FULL_THROW_CHARGE_S,
                        1
                    );

                    // ease-out, most of the power arrives early in the hold
                    const speed = min_flat_throw_speed + Math.sqrt(normalized) * (max_throw_speed - min_flat_throw_speed);

                    // aim along the pointer ray (the crosshair in flat), falling back to the grip's own forward
                    const rayNode = hand.ray.current;
                    if (rayNode) {
                        rayNode.updateWorldMatrix(true, false);
                        rayNode.getWorldQuaternion(throw_dir_quat.current);
                    } else {
                        gripObj.getWorldQuaternion(throw_dir_quat.current);
                    }

                    // inherit carry-slot motion (player locomotion, mouse flicks), capped so a look flick can't stack with full charge
                    inherited_velocity.current
                        .copy(grabVelocity.current)
                        .clampLength(0, MAX_INHERITED_SPEED);

                    throw_velocity.current
                        .copy(FWD)
                        .applyQuaternion(throw_dir_quat.current)
                        .multiplyScalar(speed)
                        .add(inherited_velocity.current);

                    throw_lockout.current.add(hand);
                    release_held(hand, body, throw_velocity.current);
                }
            }
        }

        if (!grabbingHand.current && is_trigger_held.current) {
            is_trigger_held.current = false;
            on_trigger_end?.(null);
        }

        for (const h of nearbyHands.current)
            if (!currentlyNear.has(h)) on_nearby_end?.(h);
        nearbyHands.current = currentlyNear;

        // ---- move / throw tail ----
        if (grabbingHand.current && activeHandMatrix) {
            const use_aim_offset =
                snapped_grab.current &&
                snap_grab_offset_space === "aim" &&
                !!snap_grab_offset;

            let newWorldMatrix: Matrix4;
            if (use_aim_offset) {
                newWorldMatrix = compose_aim_world_matrix(
                    grabbingHand.current,
                    activeHandMatrix,
                    snap_grab_offset!,
                    tempMatrix.current
                );
            } else {
                newWorldMatrix = tempMatrix.current.multiplyMatrices(
                    activeHandMatrix,
                    offsetMatrix.current
                );
            }

            newWorldMatrix.decompose(_p.current, _q.current, _s.current);
            grabVelocity.current
                .copy(_p.current)
                .sub(prevGrabPos.current)
                .divideScalar(Math.max(delta, 1e-4));
            prevGrabPos.current.copy(_p.current);

            if (body) {
                body.setNextKinematicTranslation({
                    x: _p.current.x,
                    y: _p.current.y,
                    z: _p.current.z
                });
                body.setNextKinematicRotation({
                    x: _q.current.x,
                    y: _q.current.y,
                    z: _q.current.z,
                    w: _q.current.w
                });
            } else {
                if (target_ref.current.parent) {
                    target_ref.current.parent.updateWorldMatrix(true, false);
                    parentInverse.current
                        .copy(target_ref.current.parent.matrixWorld)
                        .invert();
                    newWorldMatrix.premultiply(parentInverse.current);
                }
                newWorldMatrix.decompose(
                    target_ref.current.position,
                    target_ref.current.quaternion,
                    target_ref.current.scale
                );
                target_ref.current.matrixAutoUpdate = true;
            }
        }

        // ---- falling-edge restore of player collision ----
        if (restore_countdown.current !== null && !grabbingHand.current) {
            restore_countdown.current -= delta;
            if (restore_countdown.current <= 0) {
                restore_player_collision(body);
                restore_countdown.current = null;
            }
        }
    });
};

// TODO: accept props to allow scaling, position/rotation lock etc
// TODO: sticky (press another button to release) and non sticky (releases when grip lost) grabbables

interface GrabbableProps extends ComponentProps<"group"> {
    target_ref?: RefObject<Object3D | null>;
    grab_distance?: number;
    nearby_trigger_distance?: number;
    grab_offset?: [number, number, number];
    grab_offset_space?: "grip" | "aim";
    ignore_player_while_held?: boolean;
    // optional grab-region override from GrabbableInteraction.collider
    // undefined defaults to auto bounding box
    collider?: GrabCollider;
    // TODO: add remaining props from useGrabbable and GrabbableInteraction
    on_grab_start?: (input: Hand) => void;
    on_grab_end?: (input: Hand) => void;
    on_nearby_start?: (input: Hand) => void;
    on_nearby_end?: (input: Hand | null) => void;
    on_trigger_start?: (input: Hand) => void;
    on_trigger_end?: (input: Hand | null) => void; // TODO: unite these with the wider controller button interaction?
    flat_throwable?: boolean;
    min_flat_throw_speed?: number;
    max_throw_speed?: number;
}

export const Grabbable = (props: GrabbableProps) => {
    const {ref, children, collider, ...rest} = props;

    const group_ref = useRef<Group | null>(null);
    useImperativeHandle(ref as RefObject<Group | null>, () => group_ref.current!);

    const target_ref = props.target_ref || group_ref;

    const [is_nearby, setIsNearby] = useState(false);

    const handle_nearby_start = useCallback(
        (input: Hand) => {
            setIsNearby(true);
            props.on_nearby_start?.(input);
        },
        [props.on_nearby_start]
    );

    const handle_nearby_end = useCallback(
        (input: Hand | null) => {
            setIsNearby(false);
            props.on_nearby_end?.(input);
        },
        [props.on_nearby_end]
    );

    useGrabbable(target_ref, {
        grab_distance: props.grab_distance,
        nearby_trigger_distance: props.nearby_trigger_distance || props.grab_distance,
        snap_grab_offset: props.grab_offset || [0, 0, 0.15],
        snap_grab_offset_space: props.grab_offset_space || "aim",
        ignore_player_while_held: props.ignore_player_while_held,
        collider,
        on_grab_start: props.on_grab_start,
        on_grab_end: props.on_grab_end,
        on_nearby_start: handle_nearby_start,
        on_nearby_end: handle_nearby_end,
        on_trigger_start: props.on_trigger_start,
        on_trigger_end: props.on_trigger_end,
        flat_throwable: props.flat_throwable,
        min_flat_throw_speed: props.min_flat_throw_speed,
        max_throw_speed: props.max_throw_speed
    });

    useOutlineEffect(target_ref, is_nearby);

    return (
        <group ref={group_ref} {...rest}>
            {children}
        </group>
    );
}