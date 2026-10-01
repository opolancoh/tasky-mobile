import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Id } from '@/core/types';

export const RECENT_TAGS_MAX = 10;

interface RecentTagsState {
  /** Per workspace: the last tag names used on a new task, most recent first. */
  byWorkspace: Record<Id, string[]>;
  used(workspaceId: Id, names: string[]): void;
}

/** The last 10 tags used in Quick add, kept on this device (M16). Names are lower case. */
export const useRecentTags = create<RecentTagsState>()(
  persist(
    (set, get) => ({
      byWorkspace: {},
      used: (workspaceId, names) => {
        if (!names.length) return;
        const kept = (get().byWorkspace[workspaceId] ?? []).filter((n) => !names.includes(n));
        set({ byWorkspace: { ...get().byWorkspace, [workspaceId]: [...names, ...kept].slice(0, RECENT_TAGS_MAX) } });
      },
    }),
    { name: 'tasky.recentTags', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
