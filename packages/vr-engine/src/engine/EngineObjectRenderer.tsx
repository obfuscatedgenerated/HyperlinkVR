import type { CreatedEngineObject, Rotation } from "@hyperlinkvr/vr-engine-schemas";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Euler, Quaternion } from "three";

import type { RendererComponentProps } from "../types";
import { create_object_refs, ObjectRefsProvider } from "../contexts/ObjectRefsContext";
import { register_object_refs } from "./object_ref_registry";
import { CustomObjectRenderer } from "./CustomObjectRenderer";
import { PrefabRenderer } from "./PrefabRenderer";
import {EULER_ORDER} from "../consts";

const scratch_euler = new Euler();
export const rotation_to_quaternion = (rotation: Rotation, out: Quaternion): Quaternion => {
    if (rotation.length === 4) {
        return out.set(rotation[0], rotation[1], rotation[2], rotation[3]);
    }
    scratch_euler.set(rotation[0], rotation[1], rotation[2], EULER_ORDER);
    return out.setFromEuler(scratch_euler);
};

export const EngineObjectRenderer = ({ data }: { data: CreatedEngineObject }) => {
    const { type, ...obj_rest } = data.object;

    const RendererComponent = useMemo(
        () => (type === "prefab" ? PrefabRenderer : CustomObjectRenderer),
        [data.object.type]
    ) as React.ComponentType<RendererComponentProps<any>>;

    const user_data_ref = useRef(data.user_data);

    const refs = useRef(create_object_refs(data.id));

    // register refs with registry for retrieval by sdk
    useEffect(() => register_object_refs(refs.current), []);

    // rotation via quaternion so euler + quat both work
    useLayoutEffect(() => {
        const group = refs.current.root.current;
        if (!group) return;
        rotation_to_quaternion(data.transform.rotation, group.quaternion);
    }, [data.transform.rotation]);

    return (
        <ObjectRefsProvider value={refs.current}>
            <group
                ref={refs.current.root}
                position={data.transform.position}
                scale={data.transform.scale}
            >
                <RendererComponent
                    root_ref={refs.current.root}
                    user_data_ref={user_data_ref}
                    id={data.id}
                    {...obj_rest}
                />
            </group>
        </ObjectRefsProvider>
    );
};

/*
await hyperlinkvr.connect();
const h = hyperlinkvr.builders;

const button = new h.ButtonPrefabBuilder()
    .set_label("Press Me")
    .set_color(0xff0000)
    .build();

const created_button = await new h.EngineObjectDispatchBuilder()
    .set_object(button)
    .set_position(1, 1, -2)
    .create();

console.log("Created button object with ID:", created_button.id);


const duck = new h.CustomObjectBuilder()
    .set_mesh("https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/refs/heads/main/2.0/Duck/glTF-Binary/Duck.glb")
    .set_physics(new h.PhysicsSystemBuilder()
        .set_rigid_body(new h.DynamicRigidBodyBuilder()
            .set_collider(new h.ColliderBuilder().box([0.1, 1, 0.1]).build())
            .set_mass(0.2)
            .build()
        )
        .build()
    )
    .add_interaction(new h.GrabbableInteractionBuilder()
        .reports_grabs() // now recieves events when object grabbed
        .build()
    )
    .build();

const created_duck = await new h.EngineObjectDispatchBuilder()
    .set_object(duck)
    .set_position(0, 1, -2)
    .create();

console.log("Created duck object with ID:", created_duck.id);
 */