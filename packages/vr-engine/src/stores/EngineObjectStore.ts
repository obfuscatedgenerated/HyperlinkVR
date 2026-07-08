import type { CreatedEngineObject } from "@hyperlinkvr/vr-engine-schemas";
import { create } from "zustand";

interface EngineObjectState {
    // id->object data
    objects: Record<string, CreatedEngineObject>;

    add_object: (obj: CreatedEngineObject) => void;
    remove_object: (id: string) => void;
    get_object: (id: string) => CreatedEngineObject | null;
}

export const useEngineObjectStore = create<EngineObjectState>((set, get) => ({
    objects: {},

    add_object: (obj) =>
        set((state) => ({
            objects: { ...state.objects, [obj.id]: obj }
        })),

    remove_object: (id) =>
        set((state) => {
            const next = { ...state.objects };
            delete next[id];
            return { objects: next };
        }),

    get_object: (id) => {
        const obj = get().objects[id];
        if (!obj) {
            return null;
        }
        return obj;
    }
}));
