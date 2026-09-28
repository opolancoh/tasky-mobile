import Constants from 'expo-constants';
import { randomUUID } from 'expo-crypto';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { createTokenManager, type RefreshTokenStore } from '@/core/auth/tokens';
import { createHttpClient } from '@/core/http/client';
import { isApiError } from '@/core/http/problem';
import { configureHttp } from '@/data/http';
import { identityApi } from '@/data/identity/api';
import i18n from '@/shared/i18n/i18n';
import { markSignedOut } from '@/shared/session/SessionProvider';

import { config } from './config';

/** The app's single instances: HTTP client and token manager, wired to Expo's platform APIs. */

const REFRESH_TOKEN_KEY = 'tasky.refreshToken';

const refreshTokenStore: RefreshTokenStore = {
  get: () => SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
  set: (token) => SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token),
  clear: () => SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
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
  store: refreshTokenStore,
  callRefresh: identityApi.refresh,
  // 401 (expired, revoked or reused refresh token) and 403 (deactivated) end the session; network errors don't.
  isSessionEnded: (e) => isApiError(e) && (e.status === 401 || e.status === 403),
  onEnded: markSignedOut,
});

httpClient.setAuth(tokenManager);
