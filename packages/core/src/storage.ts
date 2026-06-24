export type StorageKind = "local" | "sync" | "session";

export interface StorageEngine<T extends StorageKind = StorageKind> {
    readonly kind: T;

    get<V>(key: string): Promise<V | null>;
    set<V>(key: string, value: V): Promise<void>;
    remove(key: string): Promise<void>;
    watch<V>(key: string, callback: (newValue: V | null) => void): () => void;
}
