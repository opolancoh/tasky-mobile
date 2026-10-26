import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Id } from '@/core/types';

interface FoldedListsState {
  /** Per user: the lists whose Completed section is folded, by list id or a view's name (`today`, `important`…). Open is the default, so only folded ones are kept. */
  byUser: Record<Id, Record<Id, true>>;
  setFolded(userId: Id, taskListId: Id, folded: boolean): void;
}

/** Whether a list's Completed section is folded (M63; every list Home opens too, M105), kept on this device. */
export const useFoldedLists = create<FoldedListsState>()(
  persist(
    (set, get) => ({
      byUser: {},
      setFolded: (userId, taskListId, folded) => {
        const { [taskListId]: _, ...rest } = get().byUser[userId] ?? {};
        set({ byUser: { ...get().byUser, [userId]: folded ? { ...rest, [taskListId]: true } : rest } });
      },
    }),
    { name: 'azignia.foldedLists', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
