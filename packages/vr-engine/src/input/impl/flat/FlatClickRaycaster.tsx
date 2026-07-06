import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { Object3D, Raycaster, Vector2 } from "three";


export const FlatClickRaycaster = () => {
    const { gl, camera, scene, events } = useThree();

    useEffect(() => {
        const canvas = gl.domElement;

        const sync = () => {
            const locked = document.pointerLockElement === canvas;
            if (locked) {
                // pointer locked, let us handle events ourselves
                events.disconnect?.();
            } else {
                // pointer freed, restore control to the default handlers so the user can click things
                if (!events.connected) {
                    events.connect?.(canvas);
                }
            }
        };

        document.addEventListener("pointerlockchange", sync);
        sync();

        return () => {
            document.removeEventListener("pointerlockchange", sync);
            if (!events.connected) {
                events.connect?.(canvas);
            }
        };
    }, [events, gl]);


    useEffect(() => {
        const canvas = gl.domElement;
        const raycaster = new Raycaster();
        const screen_center = new Vector2(0, 0);

        // fire ray from crosshair
        const fire_click_at_center = () => {
            if (document.pointerLockElement !== canvas) return;

            raycaster.setFromCamera(screen_center, camera);
            const hits = raycaster.intersectObjects(scene.children, true);

            for (const hit of hits) {
                if (!hit.object.visible) continue;

                let node: Object3D | null = hit.object;
                while (node) {
                    const handlers = (
                        node as {
                            __r3f?: { handlers?: Record<string, unknown> };
                        }
                    ).__r3f?.handlers;
                    const on_click = handlers?.onClick as
                        | ((event: unknown) => void)
                        | undefined;

                    if (on_click) {
                        on_click({
                            ...hit,
                            object: hit.object,
                            eventObject: node,
                            nativeEvent: undefined,
                            stopPropagation: () => {}
                        });
                        // only the nearest handler
                        return;
                    }
                    node = node.parent;
                }
            }
        };

        // "click" fires after pointer-lock is engaged, so the first lock-click
        // won't spuriously trigger a world click
        canvas.addEventListener("click", fire_click_at_center);
        return () => canvas.removeEventListener("click", fire_click_at_center);
    }, [gl, camera, scene]);

    return null;
};
