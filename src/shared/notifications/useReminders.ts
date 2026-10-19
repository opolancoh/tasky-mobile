import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useMe } from '@/data/tenancy/queries';

import { useNotificationPermission } from './permission';
import { syncReminders } from './reminders';

/** A change to tasks settles before reminders are read again: waits for a burst of saves to end. */
const AFTER_CHANGES = 1500;

/**
 * Reminders on the phone (D11, M42), mounted in App while signed in (sign-out clears them, SessionProvider): syncs at launch, when the app comes back,
 * when the profile's time zone changes, when notifications are allowed, and after any change saved to the API (a reminder
 * set in Quick add or Task detail, a task completed or deleted). A tap on a reminder opens its task (usePush handles
 * every tap).
 */
export function useReminders() {
  const queryClient = useQueryClient();
  const timeZone = useMe().data?.timeZone;
  const signedIn = !!timeZone;

  useEffect(() => {
    if (!signedIn || !timeZone) return;
    void syncReminders(timeZone);
    const app = AppState.addEventListener('change', (state) => state === 'active' && void syncReminders(timeZone));
    let timer: ReturnType<typeof setTimeout> | undefined;
    const mutations = queryClient.getMutationCache().subscribe((event) => {
      if (event.type !== 'updated' || event.mutation.state.status !== 'success') return;
      clearTimeout(timer);
      timer = setTimeout(() => void syncReminders(timeZone), AFTER_CHANGES);
    });
    return () => {
      app.remove();
      mutations();
      clearTimeout(timer);
    };
  }, [signedIn, timeZone, queryClient]);

  // Allowed from our sheet or Settings: schedule now.
  const permission = useNotificationPermission((s) => s.status);
  useEffect(() => {
    if (signedIn && timeZone && permission === 'granted') void syncReminders(timeZone);
  }, [signedIn, timeZone, permission]);
}

/** Mounted in App while signed in. */
export function ReminderSync() {
  useReminders();
  return null;
}
