import {
    get_setting,
    StorageEngine,
    update_setting,
    watch_setting
} from "@hyperlinkvr/core";
import { SettingKey, settings_def } from "@hyperlinkvr/types";
import { useCallback, useEffect, useState } from "react";

import { useStorageEngines } from "../contexts";

export const useSettingWithEngines = <K extends SettingKey>(
    key: K,
    storage: { sync?: StorageEngine<"sync">; local?: StorageEngine<"local"> }
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
            update_setting(key, new_value, storage);
            setValue(new_value);
        },
        [key, storage]
    );

    return [value, update_value] as const;
};

export const useSetting = <K extends SettingKey>(key: K) => {
    const storage_engines = useStorageEngines();
    return useSettingWithEngines(key, storage_engines);
};

// TODO: automatically debounce setting setter, with boolean to disable debounce if needed (browser storage is ratelimited)
