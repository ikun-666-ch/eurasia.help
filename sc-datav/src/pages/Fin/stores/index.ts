import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { ShaanxiCity } from "../constants";

interface ConfigStore {
  mapPlayComplete: boolean;
  selectedCity: ShaanxiCity | null;
  toggle: (key: keyof Omit<ConfigStore, "toggle" | "selectCity" | "clearCity">) => void;
  selectCity: (city: ShaanxiCity) => void;
  clearCity: () => void;
  reset: () => void;
}

export const useConfigStore = create<ConfigStore>()(
  subscribeWithSelector((set, _, store) => ({
    mapPlayComplete: false,
    selectedCity: null,
    toggle: (key) => set((s) => ({ [key]: !s[key] })),
    selectCity: (city) => set({ selectedCity: city }),
    clearCity: () => set({ selectedCity: null }),
    reset: () => set(store.getInitialState()),
  }))
);
