import { useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useMe } from '@/data/tenancy/queries';

import { syncReminders } from './reminders';

/** A change to tasks settles before reminders are read again: waits for a burst of saves to end. */
const AFTER_CHANGES = 1500;

/** Opens a reminder's task (tasky://task/{id}, the TaskDetail link). */
const openTask = (response: Notifications.NotificationResponse | null) => {
  const taskId = response?.notification.request.content.data?.taskId;
  if (typeof taskId === 'string') Linking.openURL(`tasky://task/${taskId}`);
};

/**
 * Reminders on the phone (D11, M42), mounted in App while signed in (sign-out clears them, SessionProvider): syncs at launch, when the app comes back,
 * when the profile's time zone changes and after any change saved to the API (a reminder set in Quick add or Task
 * detail, a task completed or deleted). A tap on a reminder opens its task.
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

  useEffect(() => {
    if (!signedIn) return;
    // Opened by tapping a reminder while closed, then any tap while running.
    Notifications.getLastNotificationResponseAsync().then((response) => {
      openTask(response);
      void Notifications.clearLastNotificationResponseAsync();
    });
    const sub = Notifications.addNotificationResponseReceivedListener(openTask);
    return () => sub.remove();
  }, [signedIn]);
}

/** Mounted in App while signed in. */
export function ReminderSync() {
  useReminders();
  return null;
}
