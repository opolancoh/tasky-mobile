import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Id } from '@/core/types';

/** Kept per user; the oldest go first past this (answered requests never come back, so old keys are dead). */
const MAX = 200;

interface HomeDismissedState {
  /** Per user: the Requests rows dismissed from Home (`v-<invitation>`, `a-<task>`, `f-<task>`). */
  byUser: Record<Id, string[]>;
  dismiss(userId: Id, key: string): void;
  restore(userId: Id, key: string): void;
}

/** Requests swiped away from Home (M65), kept on this device. They stay pending in See all and Activity. */
export const useHomeDismissed = create<HomeDismissedState>()(
  persist(
    (set, get) => ({
      byUser: {},
      dismiss: (userId, key) => {
        const keys = (get().byUser[userId] ?? []).filter((k) => k !== key);
        set({ byUser: { ...get().byUser, [userId]: [...keys, key].slice(-MAX) } });
      },
      restore: (userId, key) => set({ byUser: { ...get().byUser, [userId]: (get().byUser[userId] ?? []).filter((k) => k !== key) } }),
    }),
    { name: 'azignia.homeDismissed', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
