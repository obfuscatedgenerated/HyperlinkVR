import {createContext, useContext} from "react";
import type {WorldEnv, WorldEnvDeepRequired, WorldEnvFull, WorldEnvRequired} from "@hyperlinkvr/vr-engine-schemas";
import {useWebSDKMessaging} from "../contexts";

export const DEFAULT_WORLD_ENV: WorldEnvFull = {
    sky: {
        sky_zenith_color: 0x111111,
        sky_horizon_color: 0x222222,

        ground_horizon_color: 0x111111,
        ground_nadir_color: 0x000000,

        sun_direction: [0.3, 0.6, 0.2],
        sun_color: 0xffffff,
        sun_intensity: 1.0,

        sun_size: 3,
        sun_glow: 6,

        horizon_sharpness: 1.0,
        horizon_band: 0.02,

        cast_light: true,
        light_intensity: 1.0,
        light_distance: 50,

        sky_light_intensity: 0.5,

        ambient_override_color: undefined,
        ambient_override_intensity: 0.25,
    },

    fog: {
        color: 0x222222,
        near: 10,
        far: 75,
    },

    physics: {
        gravity: -9.81,
    }
};

const WorldEnvironmentContext = createContext<WorldEnvFull>(DEFAULT_WORLD_ENV);

export const FixedWorldEnvironmentProvider = WorldEnvironmentContext.Provider;

export const SDKWorldEnvironmentProvider = () => {
    const {on_action} = useWebSDKMessaging();
    // TODO
}

export const useWorldEnvironment = () => {
    const value = useContext(WorldEnvironmentContext);
    return value;
}
