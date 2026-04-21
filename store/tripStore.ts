import { create } from 'zustand';
import { Trip, Pin, TripMember, Category } from '@/types';

interface TripStore {
  trip: Trip | null;
  pins: Pin[];
  members: TripMember[];
  selectedPin: Pin | null;
  focusPinId: string | null;
  activeFilters: Category[];
  setTrip: (trip: Trip) => void;
  setPins: (pins: Pin[]) => void;
  addPin: (pin: Pin) => void;
  updatePin: (pin: Pin) => void;
  removePin: (pinId: string) => void;
  setMembers: (members: TripMember[]) => void;
  setSelectedPin: (pin: Pin | null) => void;
  setFocusPinId: (id: string | null) => void;
  toggleFilter: (cat: Category) => void;
  clearFilters: () => void;
  reset: () => void;
}

export const useTripStore = create<TripStore>((set) => ({
  trip: null,
  pins: [],
  members: [],
  selectedPin: null,
  focusPinId: null,
  activeFilters: [],

  setTrip: (trip) => set({ trip }),
  setPins: (pins) => set({ pins }),
  addPin: (pin) => set((state) => ({ pins: [pin, ...state.pins] })),
  updatePin: (pin) =>
    set((state) => ({
      pins: state.pins.map((p) => (p.id === pin.id ? pin : p)),
      selectedPin: state.selectedPin?.id === pin.id ? pin : state.selectedPin,
    })),
  removePin: (pinId) =>
    set((state) => ({
      pins: state.pins.filter((p) => p.id !== pinId),
      selectedPin: state.selectedPin?.id === pinId ? null : state.selectedPin,
    })),
  setMembers: (members) => set({ members }),
  setSelectedPin: (pin) => set({ selectedPin: pin }),
  setFocusPinId: (id) => set({ focusPinId: id }),

  toggleFilter: (cat) =>
    set((state) => ({
      activeFilters: state.activeFilters.includes(cat)
        ? state.activeFilters.filter((c) => c !== cat)
        : [...state.activeFilters, cat],
    })),

  clearFilters: () => set({ activeFilters: [] }),

  reset: () =>
    set({ trip: null, pins: [], members: [], selectedPin: null, focusPinId: null, activeFilters: [] }),
}));
