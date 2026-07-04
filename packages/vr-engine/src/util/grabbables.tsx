import type { GrabCollider } from "@hyperlinkvr/vr-engine-schemas";
import { useFrame } from "@react-three/fiber";
import { useXRInputSourceState } from "@react-three/xr";
import { ComponentProps, RefObject, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { BackSide, Box3, Group, Matrix4, Mesh, MeshBasicMaterial, Object3D, Quaternion, Sphere, Vector3 } from "three";



import { useObjectRefsOptional, useXROrigin } from "../contexts";


enum RigidBodyType {
    Fixed = 1,
    Dynamic = 0,
    KinematicPositionBased = 2,
    KinematicVelocityBased = 3
}

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
            if ((child as Mesh).isMesh && !child.userData._is_outline_effect) {
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
        if (!mesh.isMesh || child.userData._is_outline_effect) return; // skip outline shells
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

export const useGrabbable = (
    target_ref: RefObject<Object3D | null>,
    {
        grab_distance = 0.4,
        nearby_trigger_distance = 0.4,
        collider,
        on_nearby_start,
        on_nearby_end
    }: {
        grab_distance?: number,
        nearby_trigger_distance?: number,
        collider?: GrabCollider,
        on_nearby_start?: (input: XRInputSource) => void,
        on_nearby_end?: (input: XRInputSource) => void
    } = {}
) => {
    const leftController = useXRInputSourceState('controller', 'left');
    const rightController = useXRInputSourceState('controller', 'right');
    const xr_origin_ref = useXROrigin();

    // nullable: only present when a physics ancestor (ObjectPhysics) populated it
    // no ancestor -> null -> the transform-write path below runs
    const body_ref = useObjectRefsOptional()?.rigid_body ?? null;

    const grabbingSource = useRef<XRInputSource | null>(null);
    const offsetMatrix = useRef(new Matrix4());
    const tempMatrix = useRef(new Matrix4());
    const nearbyInputs = useRef(new Set<XRInputSource>());

    // throw-velocity bookkeeping
    const prevGrabPos = useRef(new Vector3());
    const grabVelocity = useRef(new Vector3());

    // scratch for the move decompose, allocated once
    const parentInverse = useRef(new Matrix4());
    const _p = useRef(new Vector3());
    const _q = useRef(new Quaternion());
    const _s = useRef(new Vector3());
    const _localHand = useRef(new Vector3());

    // built lazily and cached
    const region_tester = useRef<RegionTester | null>(null);
    const region_source = useRef<GrabCollider | undefined>(undefined);

    const ensure_region_tester = (target: Object3D): RegionTester | null => {
        // reuse unless the collider identity changed
        if (region_tester.current && region_source.current === collider) {
            return region_tester.current;
        }
        const tester = build_region_tester(collider, target);
        if (tester) {
            region_tester.current = tester;
            region_source.current = collider;
        }
        return region_tester.current;
    };

    useFrame((state, delta, frame) => {
        if (!frame || !target_ref.current || !xr_origin_ref?.current) return;

        // force full parent chain to update world matrices, so the grab region and hand pose are in sync with the scene graph
        target_ref.current.updateWorldMatrix(true, false);
        xr_origin_ref.current.updateMatrixWorld();

        const refSpace = state.gl.xr.getReferenceSpace();
        if (!refSpace) return;

        const body = body_ref?.current ?? null;
        const region = ensure_region_tester(target_ref.current);

        const controllers = [leftController, rightController].filter(Boolean);
        const currentlyNear = new Set<XRInputSource>();

        let activeHandMatrix: Matrix4 | null = null;

        // object origin, only used for the pre-load fallback + velocity seeding
        const objPos = new Vector3().setFromMatrixPosition(
            target_ref.current.matrixWorld
        );

        for (const controller of controllers) {
            if (!controller) continue;

            const gripSpace = controller.inputSource.gripSpace;
            if (!gripSpace) continue;

            const pose = frame.getPose(gripSpace, refSpace);
            if (!pose) continue;

            // raw pose is relative to the origin, not world
            // it touches anything that compares against target_ref.matrixWorld
            const handMatrix = new Matrix4()
                .fromArray(pose.transform.matrix)
                .premultiply(xr_origin_ref.current.matrixWorld);

            const handPos = new Vector3().setFromMatrixPosition(handMatrix);

            // distance to the grab region (0 inside), falling back to origin
            // distance only until the region tester is ready (geometry load)
            let distance: number;
            if (region) {
                _localHand.current.copy(handPos);
                target_ref.current.worldToLocal(_localHand.current);
                distance = region(_localHand.current);
            } else {
                distance = handPos.distanceTo(objPos);
            }

            // TEMP: remove once distances are confirmed sane
            console.log(`Distance from ${controller.inputSource.handedness} hand to object: ${distance}`);

            if (distance < nearby_trigger_distance) {
                currentlyNear.add(controller.inputSource);
                if (!nearbyInputs.current.has(controller.inputSource)) {
                    on_nearby_start?.(controller.inputSource);
                }
            }

            const isSqueezing =
                controller.gamepad["xr-standard-squeeze"]?.state === "pressed";

            if (
                isSqueezing &&
                !grabbingSource.current &&
                distance < grab_distance
            ) {
                const inverseHand = handMatrix.clone().invert();
                offsetMatrix.current.multiplyMatrices(
                    inverseHand,
                    target_ref.current.matrixWorld
                );
                grabbingSource.current = controller.inputSource;

                // seed velocity tracking so the first frame's throw isn't a spike
                prevGrabPos.current.copy(objPos);
                grabVelocity.current.set(0, 0, 0);

                // hand physics control over to us while held
                body?.setBodyType(RigidBodyType.KinematicPositionBased, true);
            } else if (
                !isSqueezing &&
                grabbingSource.current === controller.inputSource
            ) {
                grabbingSource.current = null;

                // give it back to the sim and throw with the tracked velocity
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

            if (grabbingSource.current === controller.inputSource) {
                activeHandMatrix = handMatrix;
            }
        }

        for (const input of nearbyInputs.current) {
            if (!currentlyNear.has(input)) on_nearby_end?.(input);
        }
        nearbyInputs.current = currentlyNear;

        if (grabbingSource.current && activeHandMatrix) {
            const newWorldMatrix = tempMatrix.current.multiplyMatrices(
                activeHandMatrix,
                offsetMatrix.current
            );

            // decompose the desired WORLD transform (needed for both paths + velocity)
            newWorldMatrix.decompose(_p.current, _q.current, _s.current);

            // track world velocity for a throw on release
            grabVelocity.current
                .copy(_p.current)
                .sub(prevGrabPos.current)
                .divideScalar(Math.max(delta, 1e-4));
            prevGrabPos.current.copy(_p.current);

            if (body) {
                // dynamic bodies can't be moved by writing three.js transforms --
                // drive the kinematic body in world space and let it own the mesh
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
                // no physics: convert to local space relative to the parent
                // (no-op at scene root) and write the transform directly
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
    on_nearby_start?: (input: XRInputSource) => void;
    on_nearby_end?: (input: XRInputSource) => void;
}

export const Grabbable = (props: GrabbableProps) => {
    const {ref, children, collider, ...rest} = props;

    const group_ref = useRef<Group | null>(null);
    useImperativeHandle(ref as RefObject<Group | null>, () => group_ref.current!);

    const target_ref = props.target_ref || group_ref;

    const [is_nearby, setIsNearby] = useState(false);

    const handle_nearby_start = useCallback(
        (input: XRInputSource) => {
            setIsNearby(true);
            props.on_nearby_start?.(input);
        },
        [props.on_nearby_start]
    );

    const handle_nearby_end = useCallback(
        (input: XRInputSource) => {
            setIsNearby(false);
            props.on_nearby_end?.(input);
        },
        [props.on_nearby_end]
    );

    useGrabbable(target_ref, {
        grab_distance: props.grab_distance,
        nearby_trigger_distance: props.nearby_trigger_distance || props.grab_distance,
        collider,
        on_nearby_start: handle_nearby_start,
        on_nearby_end: handle_nearby_end
    });

    useOutlineEffect(target_ref, is_nearby);

    return (
        <group ref={group_ref} {...rest}>
            {children}
        </group>
    );
}