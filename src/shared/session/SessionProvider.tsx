import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { AppState } from 'react-native';

import type { TokenManager } from '@/core/auth/tokens';
import { isApiError } from '@/core/http/problem';
import { identityApi } from '@/data/identity/api';
import type { LoginRequest } from '@/data/identity/types';
import { meQuery } from '@/data/tenancy/queries';
import i18n, { deviceLanguage, languages } from '@/shared/i18n/i18n';

import { useSessionStore, type SessionStatus } from './sessionStore';

export type { SessionStatus } from './sessionStore';

interface SessionContextValue {
  status: SessionStatus;
  signIn(credentials: LoginRequest): Promise<void>;
  signOut(): Promise<void>;
  /** From the "Can't reach Tasky" screen: checks the stored session again. */
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

  // Launch.
  useEffect(() => {
    resume();
  }, [resume]);

  // Back in the foreground while unreachable: try again on its own.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && useSessionStore.getState().status === 'unreachable') resume();
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
    const refreshToken = await tokens.refreshToken();
    if (refreshToken) await identityApi.logout(refreshToken).catch(() => undefined);   // signed out locally either way
    await tokens.clear();
    queryClient.clear();
    await i18n.changeLanguage(deviceLanguage());
    useSessionStore.getState().setUser(null);
    useSessionStore.getState().setStatus('signedOut');
  }, [tokens, queryClient]);

  const value = useMemo(() => ({ status, signIn, signOut, retry: resume }), [status, signIn, signOut, resume]);
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
