import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Id } from '@/core/types';

/** Important's order (M70): soonest first (sort=due), grouped by list on the device, or newest first (sort=created). */
export type ImportantOrder = 'due' | 'list' | 'created';

interface ImportantOrderState {
  /** Per user; Soonest is the default, so only the others are kept. */
  byUser: Record<Id, ImportantOrder>;
  set(userId: Id, order: ImportantOrder): void;
}

/** Important's Sort, chosen from ••• (M94), kept on this device. */
export const useImportantOrder = create<ImportantOrderState>()(
  persist(
    (set, get) => ({
      byUser: {},
      set: (userId, order) => {
        const { [userId]: _, ...rest } = get().byUser;
        set({ byUser: order === 'due' ? rest : { ...rest, [userId]: order } });
      },
    }),
    { name: 'azignia.importantOrder', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
