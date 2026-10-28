import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Id } from '@/core/types';

export const RECENT_LISTS_MAX = 3;

interface RecentListsState {
  /** Per user: the last task lists picked on the List page, most recent first. */
  byUser: Record<Id, Id[]>;
  used(userId: Id, taskListId: Id): void;
}

/** The last 3 lists picked, kept on this device (M111); TaskListPicker shows them as Recent. */
export const useRecentLists = create<RecentListsState>()(
  persist(
    (set, get) => ({
      byUser: {},
      used: (userId, taskListId) => {
        const kept = (get().byUser[userId] ?? []).filter((id) => id !== taskListId);
        set({ byUser: { ...get().byUser, [userId]: [taskListId, ...kept].slice(0, RECENT_LISTS_MAX) } });
      },
    }),
    { name: 'azignia.recentLists', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
