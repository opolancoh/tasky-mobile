import Constants from 'expo-constants';
import { randomUUID } from 'expo-crypto';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { create } from 'zustand';

import { collaborationApi } from '@/data/collaboration/api';
import { appInfo } from '@/shared/appInfo';
import i18n from '@/shared/i18n/i18n';

const INSTALL_KEY = 'azignia.installId';

/** The channel pushes arrive on (Android): the API sends none, so they land on "default". */
const CHANNEL = 'default';

/**
 * Push needs a real phone and our own build (TestFlight, the Android release build): Expo Go can't receive it on
 * Android since SDK 53, so it isn't tried there at all (docs/push-setup.md). Activity works the same either way.
 */
export const pushSupported = !appInfo.expoGo && Device.isDevice;

/** The Expo push token this phone registered, for Me › About in test builds (copied into Expo's push tool). */
export const usePushToken = create<{ token: string | null; set(token: string | null): void }>()((set) => ({
  token: null,
  set: (token) => set({ token }),
}));

let installId: string | null = null;

/** Made once per install and kept: the API's device row (PUT /me/devices/{installId}). */
async function getInstallId(): Promise<string> {
  installId ??= await SecureStore.getItemAsync(INSTALL_KEY);
  if (!installId) {
    installId = randomUUID();
    await SecureStore.setItemAsync(INSTALL_KEY, installId);
  }
  return installId;
}

let registered: string | null = null;

/**
 * Sends this phone's push token to the API (D97), when push works here and notifications are allowed. Again only when
 * the token changes, or `force` (a new sign-in). Failures wait for the next launch or return to the app.
 */
export async function registerPush(force = false): Promise<void> {
  if (!pushSupported) return;
  if (!(await Notifications.getPermissionsAsync()).granted) return;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, { name: i18n.t('push.channel'), importance: Notifications.AndroidImportance.HIGH });
  }
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  if (!force && token === registered) return;
  await collaborationApi.registerDevice(await getInstallId(), Platform.OS === 'ios' ? 'ios' : 'android', token);
  registered = token;
  usePushToken.getState().set(token);
}

/** Before signing out: no more pushes for this user here. Signed out locally either way (an ended session stops them too). */
export async function unregisterPush(): Promise<void> {
  registered = null;
  usePushToken.getState().set(null);
  if (!pushSupported) return;
  await collaborationApi.removeDevice(await getInstallId()).catch(() => undefined);
  await Notifications.setBadgeCountAsync(0).catch(() => undefined);
}
