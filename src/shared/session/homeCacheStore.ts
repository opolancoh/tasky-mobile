import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Id } from '@/core/types';
import type { Home } from '@/data/tasks/types';

interface HomeCacheState {
  /** Per user: the last GET /home that loaded. */
  byUser: Record<Id, Home>;
  save(userId: Id, home: Home): void;
  clear(): void;
}

/** Home's last answer, kept on this device (M105): shown at once on launch while GET /home refreshes it. Cleared on sign-out. */
export const useHomeCache = create<HomeCacheState>()(
  persist(
    (set) => ({
      byUser: {},
      save: (userId, home) => set({ byUser: { [userId]: home } }),
      clear: () => set({ byUser: {} }),
    }),
    { name: 'azignia.homeCache', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
