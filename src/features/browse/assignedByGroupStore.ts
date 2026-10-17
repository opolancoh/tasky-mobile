import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Id } from '@/core/types';

/** How Assigned by me groups its tasks (M71). */
export type AssignedByGroup = 'person' | 'status';

interface AssignedByGroupState {
  /** Per user; Person is the default, so only Status is kept. */
  byUser: Record<Id, AssignedByGroup>;
  set(userId: Id, group: AssignedByGroup): void;
}

/** Assigned by me's Person | Status switch (M71), kept on this device. */
export const useAssignedByGroup = create<AssignedByGroupState>()(
  persist(
    (set, get) => ({
      byUser: {},
      set: (userId, group) => {
        const { [userId]: _, ...rest } = get().byUser;
        set({ byUser: group === 'person' ? rest : { ...rest, [userId]: group } });
      },
    }),
    { name: 'azignia.assignedByGroup', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
