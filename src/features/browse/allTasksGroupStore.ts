import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Id } from '@/core/types';

/** How All tasks groups its tasks (M78): by due date, by list, or by person. */
export type AllTasksGroup = 'date' | 'list' | 'person';

/** Spaces' All tasks opens on Date, a team's on Person (M78). `scope`: 'all' or the team's id. */
export const defaultGroup = (scope: string): AllTasksGroup => (scope === 'all' ? 'date' : 'person');

interface AllTasksGroupState {
  /** Per user, then per scope; only choices that differ from the default are kept. */
  byUser: Record<Id, Record<string, AllTasksGroup>>;
  set(userId: Id, scope: string, group: AllTasksGroup): void;
}

/** All tasks' Group choice (M78), kept on this device per user and per scope. */
export const useAllTasksGroup = create<AllTasksGroupState>()(
  persist(
    (set, get) => ({
      byUser: {},
      set: (userId, scope, group) => {
        const { [scope]: _, ...rest } = get().byUser[userId] ?? {};
        set({ byUser: { ...get().byUser, [userId]: group === defaultGroup(scope) ? rest : { ...rest, [scope]: group } } });
      },
    }),
    { name: 'azignia.allTasksGroup', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
