import type { IsoDateTime } from '../types';

/** What sign-in, verify and refresh return (Identity's TokenResponse). */
export interface TokenPair {
  accessToken: string;
  accessTokenExpiresAt: IsoDateTime;
  refreshToken: string;
  refreshTokenExpiresAt: IsoDateTime;
}

/** Where the refresh token survives restarts: Keychain / Keystore on mobile. */
export interface RefreshTokenStore {
  get(): Promise<string | null>;
  set(token: string): Promise<void>;
  clear(): Promise<void>;
}

export interface TokenManager {
  /** A valid access token: refreshed first when it expires within a minute. Null when signed out. */
  accessToken(): Promise<string | null>;
  /** Renews both tokens. One refresh at a time; concurrent callers share it. False when the session is over. */
  refresh(): Promise<boolean>;
  set(tokens: TokenPair): Promise<void>;
  /** The stored refresh token, for sign-out. */
  refreshToken(): Promise<string | null>;
  clear(): Promise<void>;
}

const EARLY_MS = 60_000;

/**
 * Access token in memory, refresh token in the store (02-api-integration.md, Authentication).
 * `callRefresh` calls POST /auth/refresh; a rejection with `ended` true means the session is over.
 * `onEnded` runs once when a refresh fails that way, so the app can sign out.
 */
export function createTokenManager(deps: {
  store: RefreshTokenStore;
  callRefresh: (refreshToken: string) => Promise<TokenPair>;
  isSessionEnded: (error: unknown) => boolean;
  onEnded: () => void;
}): TokenManager {
  let access: { token: string; expiresAt: number } | null = null;
  let inFlight: Promise<boolean> | null = null;

  async function set(tokens: TokenPair) {
    access = { token: tokens.accessToken, expiresAt: Date.parse(tokens.accessTokenExpiresAt) };
    await deps.store.set(tokens.refreshToken);
  }

  async function clear() {
    access = null;
    await deps.store.clear();
  }

  function refresh(): Promise<boolean> {
    inFlight ??= (async () => {
      try {
        const stored = await deps.store.get();
        if (!stored) return false;
        await set(await deps.callRefresh(stored));
        return true;
      } catch (e) {
        if (!deps.isSessionEnded(e)) throw e;   // offline: keep the session, the caller shows the error
        await clear();
        deps.onEnded();
        return false;
      } finally {
        inFlight = null;
      }
    })();
    return inFlight;
  }

  return {
    async accessToken() {
      if (access && access.expiresAt - Date.now() > EARLY_MS) return access.token;
      if (!(await deps.store.get())) return null;
      return (await refresh()) ? access!.token : null;
    },
    refresh,
    set,
    refreshToken: () => deps.store.get(),
    clear,
  };
}
