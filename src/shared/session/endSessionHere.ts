import type { QueryClient } from '@tanstack/react-query';

import i18n, { deviceLanguage } from '@/shared/i18n/i18n';
import { clearReminders } from '@/shared/notifications/reminders';

import { useHomeCache } from './homeCacheStore';
import { useSessionStore } from './sessionStore';

/**
 * Every way a session ends on this phone (Sign out, a refused session at launch, a refresh refused by the server) leaves
 * it the same: no reminders, no cached data, the device's language, Sign in. Other devices keep their own.
 */
export async function endSessionHere(queryClient: QueryClient): Promise<void> {
  await clearReminders().catch(() => undefined);
  queryClient.clear();
  useHomeCache.getState().clear();
  await i18n.changeLanguage(deviceLanguage());
  useSessionStore.getState().setUser(null);
  useSessionStore.getState().setStatus('signedOut');
}
