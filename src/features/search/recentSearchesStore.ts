import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Id } from '@/core/types';

const MAX = 8;

interface RecentSearchesState {
  /** Per user: the last searches whose results were opened, most recent first. */
  byUser: Record<Id, string[]>;
  remember(userId: Id, query: string): void;
  forget(userId: Id, query: string): void;
  clear(userId: Id): void;
}

/** The last 8 searches, kept on this device (M40): shown before typing; tap to search again, ✕ to forget. */
export const useRecentSearches = create<RecentSearchesState>()(
  persist(
    (set, get) => ({
      byUser: {},
      remember: (userId, query) => {
        const q = query.trim();
        if (!q) return;
        const kept = (get().byUser[userId] ?? []).filter((x) => x.toLowerCase() !== q.toLowerCase());
        set({ byUser: { ...get().byUser, [userId]: [q, ...kept].slice(0, MAX) } });
      },
      forget: (userId, query) => set({ byUser: { ...get().byUser, [userId]: (get().byUser[userId] ?? []).filter((x) => x !== query) } }),
      clear: (userId) => set({ byUser: { ...get().byUser, [userId]: [] } }),
    }),
    { name: 'tasky.recentSearches', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
