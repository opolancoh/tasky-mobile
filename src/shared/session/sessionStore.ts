import { create } from 'zustand';

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
  setStatus(status: SessionStatus): void;
  setUser(userId: Id | null): void;
}

/**
 * App-wide client state (M13): Zustand, readable outside React (the token manager ends the session
 * with `useSessionStore.getState()`). Server data stays in TanStack Query; tokens stay in secure storage.
 * No current workspace (M31): every view shows everything the user can see.
 */
export const useSessionStore = create<SessionState>()((set) => ({
  status: 'loading',
  userId: null,
  setStatus: (status) => set({ status }),
  setUser: (userId) => set({ userId }),
}));
