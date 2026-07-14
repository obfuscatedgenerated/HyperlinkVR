import {Vector3} from "three";

const requested_movement = new Vector3();

export const request_player_movement = (delta_x: number, delta_z: number) => {
    requested_movement.x += delta_x;
    requested_movement.z += delta_z;
};

export const consume_player_movement = (out: Vector3) => {
    out.copy(requested_movement);
    requested_movement.set(0, 0, 0);
    return out;
};
