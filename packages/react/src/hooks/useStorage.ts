import type { StorageEngine, StorageKind } from "@viewportvr/core";
import { useCallback, useEffect, useRef, useState } from "react";



import { useStorageEngine } from "../contexts";


export const useStorage = <T>(
    kind: StorageKind,
    key: string,
    default_value: T
) => {
    const engine = useStorageEngine(kind);
    return useStorageFromEngine<T>(engine, key, default_value);
};

export const useStorageFromEngine = <T>(
    engine: StorageEngine,
    key: string,
    default_value: T
): [T, (new_value: T | ((prev: T) => T)) => Promise<void>] => {
    const [value, setValue] = useState<T>(default_value);
    const consolidated_value_ref = useRef<T>(default_value);

    // set initial value from storage if present
    useEffect(() => {
        engine.get<T>(key).then((val) => {
            if (val !== null) {
                consolidated_value_ref.current = val;
                setValue(val);
            }
        });
    }, [engine, key]);

    // watch for changes in storage and update state accordingly
    useEffect(() => {
        const unwatch = engine.watch<T>(key, (new_value) => {
            if (new_value === null) {
                setValue(default_value);
                consolidated_value_ref.current = default_value;
            } else {
                setValue(new_value);
                consolidated_value_ref.current = new_value;
            }
        });
        return () => unwatch();
    }, [engine, key]);

    // setter
    const setStorageValue = useCallback(async (new_value: T | ((prev: T) => T)) => {
        let computed: T;

        if (typeof new_value === "function") {
            computed = (new_value as (prev: T) => T)(consolidated_value_ref.current);
        } else {
            computed = new_value;
        }

        consolidated_value_ref.current = computed;
        setValue(computed);

        await engine.set<T>(key, computed);
    }, [engine, key]);

    return [value, setStorageValue] as const;
};
