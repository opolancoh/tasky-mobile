import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Id } from '@/core/types';

/**
 * - loading: the splash is up while the stored session is checked
 * - signedIn / signedOut: which navigation group exists
 * - unreachable: there is a session, but the API can't be reached; the session is kept and the app offers Retry
 */
export type SessionStatus = 'loading' | 'signedIn' | 'signedOut' | 'unreachable';

interface SessionState {
  status: SessionStatus;
  /** The signed-in user, from GET /me. */
  userId: Id | null;
  /** The workspace each user last chose on this device (06-mobile.md, Session). Saved; nothing else is. */
  workspaceByUser: Record<Id, Id>;
  setStatus(status: SessionStatus): void;
  setUser(userId: Id | null): void;
  chooseWorkspace(workspaceId: Id): void;
}

/**
 * App-wide client state (M13): Zustand, readable outside React (the token manager ends the session
 * with `useSessionStore.getState()`). Server data stays in TanStack Query; tokens stay in secure storage.
 */
export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      status: 'loading',
      userId: null,
      workspaceByUser: {},
      setStatus: (status) => set({ status }),
      setUser: (userId) => set({ userId }),
      chooseWorkspace: (workspaceId) => {
        const { userId, workspaceByUser } = get();
        if (userId) set({ workspaceByUser: { ...workspaceByUser, [userId]: workspaceId } });
      },
    }),
    {
      name: 'tasky.session',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ workspaceByUser: s.workspaceByUser }),
    },
  ),
);
