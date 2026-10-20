import * as SecureStore from 'expo-secure-store';

import { isConnectionError } from '@/core/http/problem';
import { collaborationApi } from '@/data/collaboration/api';
import { identityApi } from '@/data/identity/api';

const KEY = 'azignia.pendingSignOut';

/** A sign-out the API didn't hear (offline): the session to end and, when its push device wasn't removed, the install. */
interface PendingSignOut {
  refreshToken: string;
  installId: string | null;
}

const forget = () => SecureStore.deleteItemAsync(KEY).catch(() => undefined);
const keep = (pending: PendingSignOut) => SecureStore.setItemAsync(KEY, JSON.stringify(pending)).catch(() => undefined);

/** Signed out offline (M88): kept so the server still ends the session and stops this phone's pushes. */
export const keepPendingSignOut = keep;

let running: Promise<void> | null = null;

/**
 * Sends a sign-out that failed offline (M88), at launch and on coming back: removes the push device (with a token from
 * that session) and ends the session, then forgets it. Refused (the session is already over): forgotten. Offline again: kept.
 */
export function retryPendingSignOut(): Promise<void> {
  running ??= run().finally(() => {
    running = null;
  });
  return running;
}

async function run() {
  const raw = await SecureStore.getItemAsync(KEY).catch(() => null);
  if (!raw) return;
  let pending: PendingSignOut;
  try {
    pending = JSON.parse(raw) as PendingSignOut;
  } catch {
    return forget();
  }
  try {
    if (pending.installId) {
      const tokens = await identityApi.refresh(pending.refreshToken);
      await keep({ ...pending, refreshToken: tokens.refreshToken });   // rotated: the old one would end the session as reused
      await collaborationApi.removeDevice(pending.installId, tokens.accessToken);
      await identityApi.logout(tokens.refreshToken);
    } else {
      await identityApi.logout(pending.refreshToken);
    }
    await forget();
  } catch (e) {
    if (!isConnectionError(e)) await forget();
  }
}
