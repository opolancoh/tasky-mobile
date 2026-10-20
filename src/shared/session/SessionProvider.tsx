import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { AppState } from 'react-native';

import type { TokenManager } from '@/core/auth/tokens';
import { isApiError, isConnectionError } from '@/core/http/problem';
import { identityApi } from '@/data/identity/api';
import type { ChangePasswordRequest, LoginRequest } from '@/data/identity/types';
import { meQuery } from '@/data/tenancy/queries';
import i18n, { deviceLanguage, languages } from '@/shared/i18n/i18n';
import { getInstallId, pushSupported, unregisterPush } from '@/shared/notifications/push';
import { clearReminders } from '@/shared/notifications/reminders';

import { keepPendingSignOut, retryPendingSignOut } from './pendingSignOut';
import { useSessionStore, type SessionStatus } from './sessionStore';

export type { SessionStatus } from './sessionStore';

interface SessionContextValue {
  status: SessionStatus;
  signIn(credentials: LoginRequest): Promise<void>;
  signOut(): Promise<void>;
  /** Signs out every device, this one included. */
  signOutEverywhere(): Promise<void>;
  /** Changes the password; this device stays signed in with new tokens. */
  changePassword(body: ChangePasswordRequest): Promise<void>;
  /** From the "Can't reach Azignia" screen: checks the stored session again. */
  retry(): Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

/** Only a refused session means signed out; being offline, a timeout or a 5xx keep it (M12). */
const sessionRefused = (e: unknown) => isApiError(e) && (e.status === 401 || e.status === 403);

/**
 * Owns the signed-in state (06-mobile.md, Session; status lives in `useSessionStore`).
 * Launch: no stored session → Sign in. A stored one → a valid access token (saved, or refreshed) and
 * /me → the tabs, which open on Today. Refused (401/403) → Sign in. Unreachable → Retry.
 */
export function SessionProvider({ tokens, children }: { tokens: TokenManager; children: ReactNode }) {
  const queryClient = useQueryClient();
  const status = useSessionStore((s) => s.status);

  const loadAccount = useCallback(async () => {
    const me = await queryClient.fetchQuery(meQuery);
    useSessionStore.getState().setUser(me.id);
    if ((languages as readonly string[]).includes(me.language)) await i18n.changeLanguage(me.language);   // the profile's language wins
  }, [queryClient]);

  const resume = useCallback(async () => {
    const { setStatus } = useSessionStore.getState();
    try {
      if (!(await tokens.accessToken())) {
        setStatus('signedOut');   // no stored session, or the server refused it
        return;
      }
      await loadAccount();
      setStatus('signedIn');
    } catch (e) {
      if (useSessionStore.getState().status === 'signedOut') return;   // the token manager already ended it
      if (sessionRefused(e)) await tokens.clear();
      setStatus(sessionRefused(e) ? 'signedOut' : 'unreachable');
    }
  }, [tokens, loadAccount]);

  // Launch; a sign-out made offline goes out too (M88).
  useEffect(() => {
    resume();
    void retryPendingSignOut();
  }, [resume]);

  // Back in the foreground while unreachable: try again on its own.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      void retryPendingSignOut();
      if (useSessionStore.getState().status === 'unreachable') resume();
    });
    return () => sub.remove();
  }, [resume]);

  const signIn = useCallback(
    async (credentials: LoginRequest) => {
      await tokens.set(await identityApi.login(credentials));
      await loadAccount();
      useSessionStore.getState().setStatus('signedIn');
    },
    [tokens, loadAccount],
  );

  const signOut = useCallback(async () => {
    const removed = await unregisterPush();   // while still signed in: no more pushes for this user here (D97)
    const refreshToken = await tokens.refreshToken();
    // Signed out locally either way; offline, the server hears later (M88), so it ends the session and stops the pushes.
    const ended = refreshToken ? await identityApi.logout(refreshToken).then(() => true, (e: unknown) => !isConnectionError(e)) : true;
    if (refreshToken && !ended) {
      await keepPendingSignOut({ refreshToken, installId: !removed && pushSupported ? await getInstallId() : null });
    }
    await tokens.clear();
    await clearReminders().catch(() => undefined);   // this user's reminders leave the phone (M42)
    queryClient.clear();
    await i18n.changeLanguage(deviceLanguage());
    useSessionStore.getState().setUser(null);
    useSessionStore.getState().setStatus('signedOut');
  }, [tokens, queryClient]);

  /** Change password (M41): the API ends the other sessions and returns new tokens for this one. */
  const changePassword = useCallback(
    async (body: ChangePasswordRequest) => {
      await tokens.set(await identityApi.changePassword(body));
    },
    [tokens],
  );

  /** Sign out of every device, this one included (M41). */
  const signOutEverywhere = useCallback(async () => {
    await identityApi.logoutAll();
    await signOut();
  }, [signOut]);

  const value = useMemo(() => ({ status, signIn, signOut, signOutEverywhere, changePassword, retry: resume }), [status, signIn, signOut, signOutEverywhere, changePassword, resume]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}

export const useIsSignedIn = () => useSessionStore((s) => s.status === 'signedIn');
export const useIsSignedOut = () => useSessionStore((s) => s.status === 'signedOut');
export const useIsUnreachable = () => useSessionStore((s) => s.status === 'unreachable');
