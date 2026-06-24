import type { StorageEngine, StorageKind } from "@viewportvr/core";

export class ExtensionStorage<T extends StorageKind> implements StorageEngine {
    readonly kind: T;

    constructor(kind: T) {
        this.kind = kind;
    }

    get<V>(key: string): Promise<V | null> {
        return new Promise((resolve, reject) => {
            try {
                chrome.storage[this.kind].get(key, (result: unknown) => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve(result as V | null);
                    }
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    set<V>(key: string, value: V): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                chrome.storage[this.kind].set({ [key]: value }, () => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve();
                    }
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    remove(key: string): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                chrome.storage[this.kind].remove(key, () => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve();
                    }
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    watch<V>(key: string, callback: (new_value: V | null) => void): () => void {
        const listener = (
            changes: { [key: string]: chrome.storage.StorageChange },
            areaName: string
        ) => {
            if (areaName === this.kind && changes[key]) {
                callback(changes[key].newValue ?? null);
            }
        };

        chrome.storage.onChanged.addListener(listener);

        return () => {
            chrome.storage.onChanged.removeListener(listener);
        };
    }
}

// TODO: switch to browser namespace (promises)