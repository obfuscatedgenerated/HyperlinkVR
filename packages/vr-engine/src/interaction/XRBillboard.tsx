import { useFrame } from "@react-three/fiber";
import { ComponentProps, useImperativeHandle, useRef } from "react";
import { Euler, Group, Vector3 } from "three";


const _cam = new Vector3();
const _e = new Euler();

interface XRBillboardProps extends ComponentProps<"group"> {
    ref?: React.Ref<Group | null>;

    lock_x?: boolean;
    lock_y?: boolean;
    lock_z?: boolean;
}

export const XRBillboard = ({ ref = null, lock_x = false, lock_y = false, lock_z = false, children, ...rest }: XRBillboardProps) => {
    const group_ref = useRef<Group>(null);
    useImperativeHandle(ref, () => group_ref.current!);

    useFrame(({ camera }) => {
        const g = group_ref.current;
        if (!g) return;

        camera.getWorldPosition(_cam);
        g.lookAt(_cam);

        _e.setFromQuaternion(g.quaternion, "YXZ");
        if (lock_x) _e.x = 0;
        if (lock_y) _e.y = 0;
        if (lock_z) _e.z = 0;
        g.quaternion.setFromEuler(_e);
    });

    return <group ref={group_ref} {...rest}>{children}</group>;
}
