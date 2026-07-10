import {send_via_rtc} from "./messenger";
import {whoami} from "./auth";

class Player {
    readonly #selected_username: string | null = null;

    // null targets the local player (currently the only one, but thinking ahead to multiplayer)
    constructor(username: string | null = null) {
        if (username !== null) {
            throw new Error("Selecting other players is not supported yet");
        }
        this.#selected_username = username;
    }

    get_selected_username(): string | null {
        return this.#selected_username;
    }

    async get_username(): Promise<string> {
        if (this.#selected_username !== null) {
            return this.#selected_username;
        }

        const res = await whoami();
        if (!res || !res.info || !res.info.identity) {
            throw new Error("Failed to get player identity");
        }

        const {identity} = res.info;
        return `${identity.name}@${identity.host}`;
    }

    async get_position() {
        const res = await send_via_rtc({
            action: "HVRSDK_PLAYER_GET_POSITION",
            target_username: this.#selected_username
        });

        if (!res || !res.position || !res.facing) {
            throw new Error("Failed to get player position");
        }

        return {
            position: res.position,
            facing: res.facing
        }
    }

    async teleport_to(position?: [number, number, number], facing?: [number, number, number]) {
        const res = await send_via_rtc({
            action: "HVRSDK_PLAYER_TELEPORT_TO",
            target_username: this.#selected_username,
            position,
            facing // as euler XYZ
        });

        if (!res) {
            throw new Error("Failed to teleport player");
        }

        return {
            new_position: res.new_position,
            new_facing: res.new_facing
        }
    }
}

export const get_current_player = () => {
    return new Player();
}
