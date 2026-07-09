import { useFrame, useThree } from "@react-three/fiber";
import { useRapier } from "@react-three/rapier";
import { useRef } from "react";
import { Vector3 } from "three";
import {usePlayerOrigin} from "../contexts";

// 0.5 meters (roughly knee height) ensures we don't start the raycast inside the floor
const RAY_START_HEIGHT = 0.5;

// TODO: sync gravity with rapier gravity for if we allow it to change later (either shared hook or reading from rapier)
const GRAVITY = -9.81;

export const PlayerGravity = () => {
    const origin_ref = usePlayerOrigin();

    const { world, rapier } = useRapier();
    const { camera } = useThree();
    const velocity_y = useRef(0);

    const ray_origin = useRef(new Vector3());
    const ray_direction = useRef(new Vector3(0, -1, 0));

    useFrame((_, delta) => {
        if (!origin_ref.current) return;

        velocity_y.current += GRAVITY * delta;

        // cast from the players current head x/z, but from knee height y
        ray_origin.current.set(
            camera.position.x,
            origin_ref.current.position.y + RAY_START_HEIGHT,
            camera.position.z
        );

        const ray = new rapier.Ray(ray_origin.current, ray_direction.current);

        const hit = world.castRay(ray, 10.0, true);

        if (hit && hit.timeOfImpact <= RAY_START_HEIGHT) {
            // hit the floor
            velocity_y.current = 0;

            // snap origin exactly to the floor
            origin_ref.current.position.y = ray_origin.current.y - hit.timeOfImpact;
        } else {
            // falling (or about to fall)
            origin_ref.current.position.y += velocity_y.current * delta;
        }
    });

    return null;
};
