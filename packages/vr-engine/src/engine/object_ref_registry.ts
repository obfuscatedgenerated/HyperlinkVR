import type { ObjectRefsContextType } from "../contexts/ObjectRefsContext";

const registry = new Map<string, ObjectRefsContextType>();

export const register_object_refs = (refs: ObjectRefsContextType) => {
    registry.set(refs.id, refs);
    return () => {
        registry.delete(refs.id);
    };
};

export const get_object_refs = (id: string): ObjectRefsContextType | null => registry.get(id) ?? null;
