import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { ShaanxiCity } from "../constants";

interface ConfigStore {
  mapPlayComplete: boolean;
  cloud: boolean;
  bar: boolean;
  rotation: boolean;
  heat: boolean;
  mode: boolean;
  selectedCity: ShaanxiCity | null;
  toggle: (key: keyof Omit<ConfigStore, "toggle" | "selectCity" | "clearCity">) => void;
  selectCity: (city: ShaanxiCity) => void;
  clearCity: () => void;
  reset: () => void;
}

export const useConfigStore = create<ConfigStore>()(
  subscribeWithSelector((set, _, store) => ({
    mapPlayComplete: false,
    cloud: true,
    bar: true,
    rotation: true,
    heat: true,
    mode: true,
    selectedCity: null,
    toggle: (key) => set((s) => ({ [key]: !s[key] })),
    selectCity: (city) => set({ selectedCity: city }),
    clearCity: () => set({ selectedCity: null }),
    reset: () => set(store.getInitialState()),
  }))
);
