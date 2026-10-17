import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Id } from '@/core/types';

/** The Spaces sections that fold (M70). */
export type SpacesSection = 'mine' | 'shared' | 'teams' | 'tags';

interface FoldedSectionsState {
  /** Per user: the folded sections. Open is the default, so only folded ones are kept. */
  byUser: Record<Id, Partial<Record<SpacesSection, true>>>;
  toggle(userId: Id, section: SpacesSection): void;
}

/** Which Spaces sections are folded (M70), kept on this device. */
export const useFoldedSections = create<FoldedSectionsState>()(
  persist(
    (set, get) => ({
      byUser: {},
      toggle: (userId, section) => {
        const { [section]: folded, ...rest } = get().byUser[userId] ?? {};
        set({ byUser: { ...get().byUser, [userId]: folded ? rest : { ...rest, [section]: true } } });
      },
    }),
    { name: 'azignia.foldedSections', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
