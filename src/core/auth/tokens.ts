import type { IsoDateTime } from '../types';

/** What sign-in, verify and refresh return (Identity's TokenResponse). */
export interface TokenPair {
  accessToken: string;
  accessTokenExpiresAt: IsoDateTime;
  refreshToken: string;
  refreshTokenExpiresAt: IsoDateTime;
}

/**
 * Where the tokens survive restarts: Keychain / Keystore on mobile. The access token is kept too, so
 * reopening or reloading the app within its 15 minutes needs no refresh (M12): each refresh rotates the
 * refresh token, and the API ends the session if an already-used one comes back.
 */
export interface TokenStore {
  get(): Promise<TokenPair | null>;
  set(tokens: TokenPair): Promise<void>;
  clear(): Promise<void>;
}

export interface TokenManager {
  /** A valid access token: refreshed first when it expires within a minute. Null when signed out. */
  accessToken(): Promise<string | null>;
  /**
   * Renews both tokens. One refresh at a time; concurrent callers share it. False when there is no
   * session or the server ended it; throws when the server can't be reached (the session is kept).
   */
  refresh(): Promise<boolean>;
  set(tokens: TokenPair): Promise<void>;
  /** The stored refresh token, for sign-out. */
  refreshToken(): Promise<string | null>;
  clear(): Promise<void>;
}

const EARLY_MS = 60_000;

/**
 * Tokens in memory, backed by the store (02-api-integration.md, Authentication).
 * `callRefresh` calls POST /auth/refresh; `isSessionEnded` tells a refusal (the session is over) from
 * being offline. `onEnded` runs once when a refresh is refused, so the app can sign out.
 */
export function createTokenManager(deps: {
  store: TokenStore;
  callRefresh: (refreshToken: string) => Promise<TokenPair>;
  isSessionEnded: (error: unknown) => boolean;
  onEnded: () => void;
}): TokenManager {
  let current: TokenPair | null = null;
  let loaded: Promise<void> | null = null;
  let inFlight: Promise<boolean> | null = null;

  /** Reads the store once per app start. */
  const load = () =>
    (loaded ??= deps.store.get().then((stored) => {
      current ??= stored;
    }));

  async function set(tokens: TokenPair) {
    current = tokens;
    await deps.store.set(tokens);
  }

  async function clear() {
    await load();   // so a late read of the store can't bring the old tokens back
    current = null;
    await deps.store.clear();
  }

  function refresh(): Promise<boolean> {
    inFlight ??= (async () => {
      try {
        await load();
        if (!current) return false;
        await set(await deps.callRefresh(current.refreshToken));
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
      await load();
      if (!current) return null;
      if (Date.parse(current.accessTokenExpiresAt) - Date.now() > EARLY_MS) return current.accessToken;
      return (await refresh()) ? current!.accessToken : null;
    },
    refresh,
    set,
    async refreshToken() {
      await load();
      return current?.refreshToken ?? null;
    },
    clear,
  };
}
