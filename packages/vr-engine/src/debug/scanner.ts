import { instrument, secure } from "bippy";
import { Object3D } from "three";


// react sets this flag on any fiber that performed work in a commit
const PERFORMED_WORK = 0b1;

export type FlashEntry = { count: number; last: number };
export const flashes = new Map<Object3D, FlashEntry>();
let scanning = false;
export const set_scanning = (on: boolean) => {
    scanning = on;
    if (!on) flashes.clear();
};

const fiber_to_object = (fiber: any): Object3D | null => {
    const sn = fiber?.stateNode;
    if (!sn) return null;
    if (sn.isObject3D) return sn as Object3D;
    if (sn.object?.isObject3D) return sn.object as Object3D;
    return null;
};

const is_component_fiber = (fiber: any): boolean => {
    const t = fiber?.type;
    if (typeof t === "function") return true; // function / class component
    if (t && (t.render || t.$$typeof)) return true; // forwardRef / memo
    return false;
};

const collect_objects = (root: any, out: Object3D[]) => {
    let node = root.child;
    const stack: any[] = [];
    while (node || stack.length) {
        if (!node) {
            node = stack.pop();
            continue;
        }
        if (node.sibling) stack.push(node.sibling);

        const obj = fiber_to_object(node);
        if (obj) {
            out.push(obj);
            node = node.child; // a group can own meshes under the same component
        } else if (is_component_fiber(node)) {
            node = null; // nested component owns its own subtree - skip
        } else {
            node = node.child; // fragment / context / provider - transparent
        }
    }
};

// install hook before canvas mounts
instrument(
    secure({
        onCommitFiberRoot(_rendererID: number, root: any) {
            if (!scanning) return;

            const now = performance.now();
            let node = root.current;
            const stack: any[] = [];

            while (node || stack.length) {
                if (!node) {
                    node = stack.pop();
                    continue;
                }
                if (node.sibling) stack.push(node.sibling);

                const rendered =
                    (node.flags & PERFORMED_WORK) === PERFORMED_WORK;
                if (rendered) {
                    const direct = fiber_to_object(node);
                    const targets: Object3D[] = [];
                    if (direct) targets.push(direct);
                    else if (is_component_fiber(node))
                        collect_objects(node, targets);

                    for (const obj of targets) {
                        const entry = flashes.get(obj);
                        if (entry) {
                            entry.count++;
                            entry.last = now;
                        } else {
                            flashes.set(obj, { count: 1, last: now });
                        }
                    }
                }
                node = node.child;
            }
        }
    })
);
