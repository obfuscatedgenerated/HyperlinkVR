import { useEffect, useState } from "react";

import type { StorageKind } from "@viewportvr/core";
import { useStorageEngine } from "../contexts";

export function useStorage<T>(kind: StorageKind, key: string, default_value: T): [T | null, (new_value: T) => Promise<void>] {
    const engine = useStorageEngine(kind);

    const [value, setValue] = useState<T | null>(default_value);

    // set initial value from storage if present
    useEffect(() => {
        engine.get<T>(key).then((val) => {
            if (val !== null) setValue(val);
        });
    }, [engine, key]);

    // watch for changes in storage and update state accordingly
    useEffect(() => {
        engine.watch<T>(key, setValue);
        return () => engine.unwatch<T>(key, setValue);
    }, [engine, key]);

    // setter
    const setStorageValue = async (newValue: T) => {
        setValue(newValue);
        await engine.set<T>(key, newValue);
    };

    return [value, setStorageValue] as const;
}
