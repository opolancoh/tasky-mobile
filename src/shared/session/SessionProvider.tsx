import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { TokenManager } from '@/core/auth/tokens';
import { identityApi } from '@/data/identity/api';
import type { LoginRequest } from '@/data/identity/types';
import { meQuery } from '@/data/tenancy/queries';
import { workspacesQuery } from '@/data/workspaces/queries';
import i18n, { deviceLanguage, languages } from '@/shared/i18n/i18n';

export type SessionStatus = 'loading' | 'signedOut' | 'signedIn';

interface SessionContextValue {
  status: SessionStatus;
  signIn(credentials: LoginRequest): Promise<void>;
  signOut(): Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

/**
 * Owns the signed-in state (06-mobile.md, Session). On launch, a stored refresh token is renewed;
 * sign-in stores the tokens and loads /me and /workspaces; sign-out ends the session and clears the cache.
 * `onEnded` of the token manager must call `markSignedOut` (see src/app/services.ts).
 */
export function SessionProvider({ tokens, children }: { tokens: TokenManager; children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<SessionStatus>('loading');

  const loadAccount = useCallback(async () => {
    const [me] = await Promise.all([queryClient.fetchQuery(meQuery), queryClient.fetchQuery(workspacesQuery)]);
    if ((languages as readonly string[]).includes(me.language)) await i18n.changeLanguage(me.language);   // the profile's language wins
  }, [queryClient]);

  useEffect(() => {
    sessionEnded = () => {
      queryClient.clear();
      setStatus('signedOut');
    };
    let cancelled = false;
    (async () => {
      try {
        if (!(await tokens.refreshToken()) || !(await tokens.refresh())) throw new Error('no session');
        await loadAccount();
        if (!cancelled) setStatus('signedIn');
      } catch {
        // Offline at launch or the session is over: sign in again. (Offline start comes with offline support.)
        if (!cancelled) setStatus('signedOut');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tokens, loadAccount, queryClient]);

  const signIn = useCallback(
    async (credentials: LoginRequest) => {
      await tokens.set(await identityApi.login(credentials));
      await loadAccount();
      setStatus('signedIn');
    },
    [tokens, loadAccount],
  );

  const signOut = useCallback(async () => {
    const refreshToken = await tokens.refreshToken();
    if (refreshToken) await identityApi.logout(refreshToken).catch(() => undefined);   // signed out locally either way
    await tokens.clear();
    queryClient.clear();
    await i18n.changeLanguage(deviceLanguage());
    setStatus('signedOut');
  }, [tokens, queryClient]);

  const value = useMemo(() => ({ status, signIn, signOut }), [status, signIn, signOut]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

let sessionEnded: () => void = () => undefined;

/** For the token manager: the server ended the session (refresh refused). */
export const markSignedOut = () => sessionEnded();

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}

export const useIsSignedIn = () => useSession().status === 'signedIn';
export const useIsSignedOut = () => useSession().status === 'signedOut';
