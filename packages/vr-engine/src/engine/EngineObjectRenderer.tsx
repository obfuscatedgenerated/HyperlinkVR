import type { CreatedEngineObject } from "@hyperlinkvr/vr-engine-schemas";
import { useMemo, useRef } from "react";
import type { Group } from "three";

import type { RendererComponentProps } from "../types";
import { CustomObjectRenderer } from "./CustomObjectRenderer";
import { PrefabRenderer } from "./PrefabRenderer";


export const EngineObjectRenderer = ({data}: {data: CreatedEngineObject}) => {
    const {type, ...obj_rest} = data.object;

    const RendererComponent = useMemo(
        () => type === "prefab" ? PrefabRenderer : CustomObjectRenderer,
        [data.object.type]
    ) as React.ComponentType<RendererComponentProps<any>>;

    const user_data_ref = useRef(data.user_data);

    const root_ref = useRef<Group>(null);

    // TODO: handle monitors
    
    return (
        <group
            ref={root_ref}
            position={data.transform.position}
            //rotation={data.transform.rotation} // TODO: need order on euler rotation data, and how do we use quat?
            scale={data.transform.scale}
        >
            <RendererComponent
                root_ref={root_ref}
                user_data_ref={user_data_ref}
                id={data.id}
                {...obj_rest}
            />
        </group>
    );
}

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