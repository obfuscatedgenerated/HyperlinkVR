import type { GrabCollider } from "@hyperlinkvr/vr-engine-schemas";
import { useFrame } from "@react-three/fiber";
import { ComponentProps, RefObject, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { BackSide, Box3, Group, Matrix4, Mesh, MeshBasicMaterial, Object3D, Quaternion, Raycaster, Sphere, Vector3 } from "three";

import { useObjectRefsOptional } from "../contexts";
import { Hand, useHands } from "../input/hands";

enum RigidBodyType {
    Fixed = 1,
    Dynamic = 0,
    KinematicPositionBased = 2,
    KinematicVelocityBased = 3
}

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
    const c = sphere.center.clone();
    const r = sphere.radius;
    return (p) => Math.max(0, p.distanceTo(c) - r);
};

const build_region_tester = (collider: GrabCollider | undefined, target: Object3D): RegionTester | null => {
    if (!collider) return bounding_box_tester(target);

    switch (collider.type) {
        case "box": {
            const [sx, sy, sz] = collider.size; // full size
            const box = new Box3(
                new Vector3(-sx / 2, -sy / 2, -sz / 2),
                new Vector3(sx / 2, sy / 2, sz / 2)
            );
            return (p) => box.distanceToPoint(p);
        }
        case "sphere": {
            const r = collider.radius;
            return (p) => Math.max(0, p.length() - r); // centered at origin
        }
        case "capsule": {
            const r = collider.radius;
            const segHalf = Math.max(0, collider.height / 2 - r); // full-height assumption
            const a = new Vector3(0, -segHalf, 0);
            const b = new Vector3(0, segHalf, 0);
            return (p) => Math.max(0, distance_from_point_to_segment(p, a, b) - r);
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
        collider,
        on_grab_start,
        on_grab_end,
        on_nearby_start,
        on_nearby_end,
        on_trigger_start,
        on_trigger_end
    }: {
        grab_distance?: number;
        nearby_trigger_distance?: number;
        reach?: number;
        snap_to_hand?: boolean;
        collider?: GrabCollider;
        on_grab_start?: (hand: Hand) => void;
        on_grab_end?: (hand: Hand) => void;
        on_nearby_start?: (hand: Hand) => void;
        on_nearby_end?: (hand: Hand) => void;
        on_trigger_start?: (hand: Hand) => void;
        on_trigger_end?: (hand: Hand | null) => void;
    } = {}
) => {
    const hands = useHands();
    const body_ref = useObjectRefsOptional()?.rigid_body ?? null;

    const grabbingHand = useRef<Hand | null>(null);
    const offsetMatrix = useRef(new Matrix4());
    const tempMatrix = useRef(new Matrix4());
    const nearbyHands = useRef(new Set<Hand>());

    const prevGrabPos = useRef(new Vector3());
    const grabVelocity = useRef(new Vector3());

    const parentInverse = useRef(new Matrix4());
    const _p = useRef(new Vector3());
    const _q = useRef(new Quaternion());
    const _s = useRef(new Vector3());
    const _objPos = useRef(new Vector3());
    const _localHand = useRef(new Vector3());

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
                (proximity_ok || ray_ok)
            ) {
                if (ray_ok || snap_to_hand) {
                    offsetMatrix.current.identity(); // snap to carry slot (TODO: grab_offset)
                } else {
                    offsetMatrix.current.multiplyMatrices(
                        // keep captured relative pose (VR touch)
                        handMatrix.clone().invert(),
                        target_ref.current.matrixWorld
                    );
                }
                grabbingHand.current = hand;
                on_grab_start?.(hand);
                prevGrabPos.current.copy(objPos);
                grabVelocity.current.set(0, 0, 0);
                body?.setBodyType(RigidBodyType.KinematicPositionBased, true);
            } else if (!hand.grab.pressed && grabbingHand.current === hand) {
                grabbingHand.current = null;
                on_grab_end?.(hand);
                if (body) {
                    body.setBodyType(RigidBodyType.Dynamic, true);
                    body.setLinvel(
                        {
                            x: grabVelocity.current.x,
                            y: grabVelocity.current.y,
                            z: grabVelocity.current.z
                        },
                        true
                    );
                }
            }

            if (grabbingHand.current === hand) {
                activeHandMatrix = handMatrix;
                if (hand.trigger.just_pressed) {
                    is_trigger_held.current = true;
                    on_trigger_start?.(hand);
                } else if (hand.trigger.just_released) {
                    is_trigger_held.current = false;
                    on_trigger_end?.(hand);
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

        // ---- move / throw tail: UNCHANGED from yours, only grabbingSource → grabbingHand ----
        if (grabbingHand.current && activeHandMatrix) {
            const newWorldMatrix = tempMatrix.current.multiplyMatrices(
                activeHandMatrix,
                offsetMatrix.current
            );
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
    });
};

// TODO: accept props to allow scaling, position/rotation lock etc
// TODO: sticky (press another button to release) and non sticky (releases when grip lost) grabbables
// TODO: should actually snap to the hand by default at least, with option to allow the sort of berhaviour we want from the camera (the only current grabbable)

interface GrabbableProps extends ComponentProps<"group"> {
    target_ref?: RefObject<Object3D | null>;
    grab_distance?: number;
    nearby_trigger_distance?: number;
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
        collider,
        on_grab_start: props.on_grab_start,
        on_grab_end: props.on_grab_end,
        on_nearby_start: handle_nearby_start,
        on_nearby_end: handle_nearby_end,
        on_trigger_start: props.on_trigger_start,
        on_trigger_end: props.on_trigger_end
    });

    useOutlineEffect(target_ref, is_nearby);

    return (
        <group ref={group_ref} {...rest}>
            {children}
        </group>
    );
}

// TODO: hands being handled incorrectly, always snaps to right in vr!