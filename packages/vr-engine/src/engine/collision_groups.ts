import { interactionGroups } from "@react-three/rapier";

export const GROUP_DEFAULT = 0;
export const GROUP_PLAYER = 1;

export const PLAYER_COLLISION_GROUPS = interactionGroups(GROUP_PLAYER);


export const PLAYER_FILTER_BIT = 1 << GROUP_PLAYER;

// how long after release we keep ignoring the player, so a receding hand can't bat the object as it turns dynamic again
export const PLAYER_IGNORE_RELEASE_DELAY_S = 0.25;
