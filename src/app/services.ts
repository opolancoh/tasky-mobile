import Constants from 'expo-constants';
import { randomUUID } from 'expo-crypto';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { createTokenManager, type TokenPair, type TokenStore } from '@/core/auth/tokens';
import { createHttpClient } from '@/core/http/client';
import { isApiError } from '@/core/http/problem';
import { configureHttp } from '@/data/http';
import { identityApi } from '@/data/identity/api';
import i18n from '@/shared/i18n/i18n';
import { useSessionStore } from '@/shared/session/sessionStore';

import { config } from './config';
import { queryClient } from './queryClient';

/** The app's single instances: HTTP client and token manager, wired to Expo's platform APIs. */

const TOKENS_KEY = 'tasky.tokens';
/** Before M12 only the refresh token was kept, under this key; read once so those sessions carry on. */
const OLD_REFRESH_TOKEN_KEY = 'tasky.refreshToken';

const tokenStore: TokenStore = {
  async get() {
    const saved = await SecureStore.getItemAsync(TOKENS_KEY);
    if (saved) return JSON.parse(saved) as TokenPair;
    const refreshToken = await SecureStore.getItemAsync(OLD_REFRESH_TOKEN_KEY);
    return refreshToken ? { accessToken: '', accessTokenExpiresAt: new Date(0).toISOString(), refreshToken, refreshTokenExpiresAt: '' } : null;
  },
  async set(tokens) {
    await SecureStore.setItemAsync(TOKENS_KEY, JSON.stringify(tokens));
    await SecureStore.deleteItemAsync(OLD_REFRESH_TOKEN_KEY);
  },
  async clear() {
    await SecureStore.deleteItemAsync(TOKENS_KEY);
    await SecureStore.deleteItemAsync(OLD_REFRESH_TOKEN_KEY);
  },
};

const appVersion = Constants.expoConfig?.version ?? '0.0.0';

export const httpClient = createHttpClient({
  baseUrl: config.apiUrl,
  newId: randomUUID,
  headers: () => ({
    'X-Client': `${Platform.OS}/${appVersion}`,
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
    useSessionStore.getState().setUser(null);
    useSessionStore.getState().setStatus('signedOut');
  },
});

httpClient.setAuth(tokenManager);
