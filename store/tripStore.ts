import { create } from 'zustand';
import { Trip, Pin, TripMember } from '@/types';

interface TripStore {
  trip: Trip | null;
  pins: Pin[];
  members: TripMember[];
  setTrip: (trip: Trip) => void;
  setPins: (pins: Pin[]) => void;
  addPin: (pin: Pin) => void;
  setMembers: (members: TripMember[]) => void;
  reset: () => void;
}

export const useTripStore = create<TripStore>((set) => ({
  trip: null,
  pins: [],
  members: [],

  setTrip: (trip) => set({ trip }),
  setPins: (pins) => set({ pins }),
  addPin: (pin) => set((state) => ({ pins: [pin, ...state.pins] })),
  setMembers: (members) => set({ members }),
  reset: () => set({ trip: null, pins: [], members: [] }),
}));
