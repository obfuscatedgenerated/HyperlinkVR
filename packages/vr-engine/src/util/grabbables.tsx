import { useFrame, useThree } from "@react-three/fiber";
import { Handle, HandleTarget } from "@react-three/handle";
import { useXRInputSourceEvent, useXRInputSourceState, useXRInputSourceStates } from "@react-three/xr";
import { ComponentProps, RefObject, useEffect, useImperativeHandle, useRef, useState } from "react";
import { BackSide, Group, Matrix4, Mesh, MeshBasicMaterial, Object3D, Vector3 } from "three";





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

// export const CustomHandleTarget = ({children}: {children: React.ReactNode}) => {
//     return (
//         <HandleTarget>
//             {children}
//         </HandleTarget>
//     );
// }
//
// export const CustomHandle = (props: React.ComponentPropsWithoutRef<typeof Handle>) => {
//     const {children, bind, handleRef, ...rest} = props;
//
//     return (
//         <Handle bind={false} {...rest}>
//             <HighlightWhenInReach>
//                 {children}
//             </HighlightWhenInReach>
//         </Handle>
//     );
// }

export const useGrabbable = (
    target_ref: RefObject<Object3D | null>,
    {
        grab_distance = 0.4,
        nearby_trigger_distance = 0.4,
        on_nearby_start,
        on_nearby_end
    }: {
        grab_distance?: number,
        nearby_trigger_distance?: number,
        on_nearby_start?: (input: XRInputSource) => void,
        on_nearby_end?: (input: XRInputSource) => void
    } = {}
) => {
    const leftController = useXRInputSourceState('controller', 'left');
    const rightController = useXRInputSourceState('controller', 'right');

    const grabbingSource = useRef<XRInputSource | null>(null);
    const offsetMatrix = useRef(new Matrix4());
    const tempMatrix = useRef(new Matrix4());
    const nearbyInputs = useRef(new Set<XRInputSource>());

    useFrame((state, delta, frame) => {
        if (!frame ||!target_ref.current) return;
        target_ref.current.updateMatrixWorld();

        const refSpace = state.gl.xr.getReferenceSpace();
        if (!refSpace) return;

        const controllers = [leftController, rightController].filter(Boolean);
        const currentlyNear = new Set<XRInputSource>();

        let activeGripPose: XRPose | null = null;

        for (const controller of controllers) {
            if (!controller) continue;

            const gripSpace = controller.inputSource.gripSpace;
            if (!gripSpace) continue;

            // 2. GET THE POSE FROM THE FRAME
            const pose = frame.getPose(gripSpace, refSpace);
            if (!pose) continue;

            // 3. EXTRACT POSITION FROM DOMPointReadOnly
            const pos = pose.transform.position;
            const handPos = new Vector3(pos.x, pos.y, pos.z);
            const objPos = new Vector3().setFromMatrixPosition(target_ref.current.matrixWorld);
            const distance = handPos.distanceTo(objPos);

            // 1. Proximity Callbacks
            if (distance < nearby_trigger_distance) {
                currentlyNear.add(controller.inputSource);
                if (!nearbyInputs.current.has(controller.inputSource)) {
                    on_nearby_start?.(controller.inputSource);
                }
            }

            // 2. Grab Logic
            const isSqueezing = controller.gamepad['xr-standard-squeeze']?.state === "pressed";

            if (isSqueezing && !grabbingSource.current && distance < grab_distance) {
                // Lock Grab
                const handMatrix = tempMatrix.current.fromArray(
                    pose.transform.matrix
                );
                handMatrix.invert();
                offsetMatrix.current.multiplyMatrices(handMatrix, target_ref.current.matrixWorld);
                grabbingSource.current = controller.inputSource;
            } else if (!isSqueezing && grabbingSource.current === controller.inputSource) {
                // Release
                grabbingSource.current = null;
            }

            if (grabbingSource.current === controller.inputSource) {
                activeGripPose = pose;
            }
        }

        // Cleanup nearby
        for (const input of nearbyInputs.current) {
            if (!currentlyNear.has(input)) on_nearby_end?.(input);
        }
        nearbyInputs.current = currentlyNear;

        // 3. Movement
        if (grabbingSource.current && activeGripPose) {
            // Create the matrix from the pose transformation array
            const handMatrix = tempMatrix.current.fromArray(
                activeGripPose.transform.matrix
            );

            // Apply the offset (captured at the moment of 'squeezestart')
            handMatrix.multiply(offsetMatrix.current);

            // Decompose into position/quaternion/scale
            handMatrix.decompose(
                target_ref.current.position,
                target_ref.current.quaternion,
                target_ref.current.scale
            );

            // IMPORTANT: Tell Three.js that the object has moved locally
            target_ref.current.matrixAutoUpdate = true;
        }
    });
};

// TODO: accept props to allow scaling, position/rotation lock etc
// TODO: sticky (press another button to release) and non sticky (releases when grip lost) grabbables
export const Grabbable = (props: ComponentProps<"group">) => {
    const {ref, children, ...rest} = props;

    const group_ref = useRef<Group | null>(null);
    useImperativeHandle(ref as RefObject<Group | null>, () => group_ref.current);

    const [is_nearby, setIsNearby] = useState(false);
    useGrabbable(group_ref, {
        on_nearby_start: () => setIsNearby(true),
        on_nearby_end: () => setIsNearby(false)
    });

    useOutlineEffect(group_ref, is_nearby);

    return (
        <group ref={group_ref} {...rest}>
            {children}
        </group>
    );
}

// TODO: PhysicsGrabbable