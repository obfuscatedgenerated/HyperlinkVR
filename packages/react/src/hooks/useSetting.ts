import {
    get_setting,
    StorageEngine,
    update_setting,
    watch_setting
} from "@hyperlinkvr/core";
import { SettingKey, settings_def } from "@hyperlinkvr/types";
import { useCallback, useEffect, useState } from "react";

import { useStorageEngines } from "../contexts";
import { useDebounce } from "./useDebounce";

export const useSettingWithEngines = <K extends SettingKey>(
    key: K,
    storage: { sync?: StorageEngine<"sync">; local?: StorageEngine<"local"> },
    debounce_delay = 500
) => {
    const [value, setValue] = useState<(typeof settings_def)[K]["default_value"]>(
        settings_def[key].default_value
    );

    useEffect(() => {
        get_setting(key, storage).then(setValue);
        return watch_setting(key, setValue, storage);
    }, [key, storage]);

    const update_value = useCallback(
        (new_value: (typeof settings_def)[K]["default_value"]) => {
            //update_setting(key, new_value, storage);
            setValue(new_value);
        },
        [key, storage]
    );

    // debounce setting updates (set delay to 0 to disable, but not recommended)
    // with leading edge for quick responses to one off events
    const debounced_value = useDebounce(value, debounce_delay, true);

    useEffect(() => {
        update_setting(key, debounced_value, storage);
    }, [key, debounced_value, storage]);

    return [value, update_value] as const;
};

export const useSetting = <K extends SettingKey>(key: K, debounce_delay = 500) => {
    const storage_engines = useStorageEngines();
    return useSettingWithEngines(key, storage_engines, debounce_delay);
};

// TODO: use context to make it sync to business logic immediately even if not commited. leading edge helps but not perfect. make it optional to use setting context too as its a little annoying
// (also currently the debounces are per useSetting call, context would actually ensure global debounce)
// would be nice if the existing hook could contextually figure out if its in a context or not, and rather than error just fallback to unique instance (needs little app code change!)
