import { create } from "zustand";

interface WorldLoadingStateStore {
    loading: boolean;
    world_ready: boolean;
    timed_out: boolean;
    set_loading: (loading: boolean) => void;
    set_world_ready: (world_ready: boolean) => void;
    set_timed_out: (timed_out: boolean) => void;
    reset_for_new_document: () => void;
}

export const useWorldLoadingStateStore = create<WorldLoadingStateStore>((set) => ({
    loading: false,
    world_ready: false,
    timed_out: false,
    set_loading: (loading) => set({ loading }),
    set_world_ready: (world_ready) => set({ world_ready }),
    set_timed_out: (timed_out) => set({ timed_out }),
    reset_for_new_document: () => set({ world_ready: false, timed_out: false })
}));
