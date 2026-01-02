import { create } from "zustand";
type Filters = { entity?: string; period?: string };
type FilterState = Filters & { setFilters: (p: Filters) => void };
export const useFilters = create<FilterState>((set) => ({
  entity: "HKOZKAN",
  period: "2025-Q4",
  setFilters: (p) => set(p),
}));
type UIState = {
  isOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
};
export const useUI = create<UIState>((set, get) => ({
  isOpen: false,
  openDrawer: () => set({ isOpen: true }),
  closeDrawer: () => set({ isOpen: false }),
  toggleDrawer: () => set({ isOpen: !get().isOpen }),
}));
type Selection = { partnerId?: string };
type SelectionState = {
  selection: Selection;
  pick: (s: Selection) => void;
  reset: () => void;
};
export const useSelection = create<SelectionState>((set) => ({
  selection: {},
  pick: (s) => set((st) => ({ selection: { ...st.selection, ...s } })),
  reset: () => set({ selection: {} }),
}));
