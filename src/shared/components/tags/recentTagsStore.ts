import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Id } from '@/core/types';

export const RECENT_TAGS_MAX = 10;

interface RecentTagsState {
  /** Per user (tags are each person's, D60): the last tag names used on a new task, most recent first. */
  byUser: Record<Id, string[]>;
  used(userId: Id, names: string[]): void;
}

/** The last 10 tags used on new tasks, kept on this device (M16); TagPicker lists them first. Names are lower case. */
export const useRecentTags = create<RecentTagsState>()(
  persist(
    (set, get) => ({
      byUser: {},
      used: (userId, names) => {
        if (!names.length) return;
        const kept = (get().byUser[userId] ?? []).filter((n) => !names.includes(n));
        set({ byUser: { ...get().byUser, [userId]: [...names, ...kept].slice(0, RECENT_TAGS_MAX) } });
      },
    }),
    { name: 'tasky.recentTags.v2', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
