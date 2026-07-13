import { create } from "zustand";

interface LoadingStore {
    loading: boolean;
    set_loading: (loading: boolean) => void;
}

export const useLoadingStore = create<LoadingStore>((set) => ({
    loading: false,
    set_loading: (loading) => set({ loading })
}));
