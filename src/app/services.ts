import { getRandomValues } from 'expo-crypto';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { createTokenManager, type TokenPair, type TokenStore } from '@/core/auth/tokens';
import { createHttpClient } from '@/core/http/client';
import { uuidv7 } from '@/core/ids';
import { combineLoggers, createConsoleHttpLogger } from '@/core/http/httpLog';
import { isApiError } from '@/core/http/problem';
import { configureHttp } from '@/data/http';
import { identityApi } from '@/data/identity/api';
import { appInfo } from '@/shared/appInfo';
import { breadcrumbRecorder } from '@/shared/errors/breadcrumbs';
import { configureErrorReports } from '@/shared/errors/errorReports';
import { networkRecorder } from '@/shared/network/networkLog';
import i18n from '@/shared/i18n/i18n';
import { useHomeCache } from '@/shared/session/homeCacheStore';
import { useSessionStore } from '@/shared/session/sessionStore';

import { config } from './config';
import { queryClient } from './queryClient';

/** The app's single instances: HTTP client and token manager, wired to Expo's platform APIs. */

const TOKENS_KEY = 'azignia.tokens';

const tokenStore: TokenStore = {
  async get() {
    const saved = await SecureStore.getItemAsync(TOKENS_KEY);
    return saved ? (JSON.parse(saved) as TokenPair) : null;
  },
  async set(tokens) {
    await SecureStore.setItemAsync(TOKENS_KEY, JSON.stringify(tokens));
  },
  async clear() {
    await SecureStore.deleteItemAsync(TOKENS_KEY);
  },
};

export const httpClient = createHttpClient({
  baseUrl: config.apiUrl,
  newId: () => uuidv7(getRandomValues(new Uint8Array(10))),
  onClientTooOld: () => useSessionStore.getState().requireUpdate(),
  // Development only: every call in the Metro terminal; EXPO_PUBLIC_HTTP_LOG=off|errors|all (default all).
  // and, while recording, the Network log (Me › About, support and admin); and always, Error reports' breadcrumbs (M89).
  log: combineLoggers(__DEV__ ? createConsoleHttpLogger(config.httpLog) : undefined, networkRecorder, breadcrumbRecorder),
  headers: () => ({
    'X-Client': `${Platform.OS}/${appInfo.version}`,
    ...(Device.deviceName ? { 'X-Device-Name': Device.deviceName } : {}),
    'Accept-Language': i18n.language,
  }),
});
configureHttp(httpClient);

export const tokenManager = createTokenManager({
  store: tokenStore,
  callRefresh: identityApi.refresh,
  // 401 (expired, revoked or reused refresh token) and 403 (deactivated) end the session; network errors don't.
  isSessionEnded: (e) => isApiError(e) && (e.status === 401 || e.status === 403),
  onEnded: () => {
    queryClient.clear();
    useHomeCache.getState().clear();
    useSessionStore.getState().setUser(null);
    useSessionStore.getState().setStatus('signedOut');
  },
});

httpClient.setAuth(tokenManager);

// Error reports go with a plain fetch and the current access token, never refreshed for it (M89).
configureErrorReports({ url: `${config.apiUrl}/logging/client-errors`, token: () => tokenManager.peekAccessToken() });
