import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { ShaanxiCity } from "../constants";

interface MapStyleStore {
  newStyle: boolean;
  pureMode: boolean;
  selectedCity: ShaanxiCity | null;
  toggleMapStyle: () => void;
  togglePureMode: () => void;
  selectCity: (city: ShaanxiCity) => void;
  clearCity: () => void;
}

export const useMapStyleStore = create<MapStyleStore>()(
  subscribeWithSelector((set) => ({
    newStyle: false,
    pureMode: false,
    selectedCity: null,
    toggleMapStyle: () => set((s) => ({ newStyle: !s.newStyle })),
    togglePureMode: () => set((s) => ({ pureMode: !s.pureMode })),
    selectCity: (city) => set({ selectedCity: city }),
    clearCity: () => set({ selectedCity: null }),
  }))
);
