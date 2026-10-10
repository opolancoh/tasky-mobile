import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { create } from 'zustand';

import { instantIn } from '@/core/dates/localDate';
import { tasksApi } from '@/data/tasks/api';
import i18n from '@/shared/i18n/i18n';

/** iOS keeps 64 pending notifications; the nearest 50 leave room (04-notifications.md). */
const MAX = 50;
const PREFIX = 'reminder-';
const CHANNEL = 'reminders';

/** Whether reminders can alert: Me shows "Off" with a way to iOS Settings when not (M42). */
export const useReminderPermission = create<{ status: 'unknown' | 'granted' | 'denied'; set(status: 'granted' | 'denied'): void }>()((set) => ({
  status: 'unknown',
  set: (status) => set({ status }),
}));

/** Reminders show while the app is open too, as a banner with sound. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

/**
 * Asks once, when it matters (the user has a reminder, 04-notifications.md), never at launch. Returns whether reminders
 * may alert.
 */
async function allowed(hasReminders: boolean): Promise<boolean> {
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && permission.canAskAgain && hasReminders) permission = await Notifications.requestPermissionsAsync();
  useReminderPermission.getState().set(permission.granted ? 'granted' : 'denied');
  return permission.granted;
}

/**
 * Makes the phone's scheduled notifications match the user's reminders (D11, 04-notifications.md): the nearest 50 from
 * GET /me/reminders, each firing at its date and time in the profile's time zone. Adds what is missing, replaces what
 * changed, removes the rest. Safe to run often.
 */
async function sync(timeZone: string): Promise<void> {
  const { items } = await tasksApi.myReminders(MAX);
  const now = Date.now();
  const wanted = new Map(
    items
      .map((r) => ({ id: `${PREFIX}${r.taskId}`, taskId: r.taskId, title: r.title, at: instantIn(r.date, r.time, timeZone).getTime() }))
      .filter((r) => r.at > now)
      .map((r) => [r.id, r]),
  );
  if (!(await allowed(wanted.size > 0))) return;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, { name: i18n.t('reminders.channel'), importance: Notifications.AndroidImportance.HIGH });
  }

  const scheduled = (await Notifications.getAllScheduledNotificationsAsync()).filter((n) => n.identifier.startsWith(PREFIX));
  for (const n of scheduled) {
    const want = wanted.get(n.identifier);
    const same = want && n.content.data?.at === want.at && n.content.title === want.title;
    if (same) wanted.delete(n.identifier);
    else await Notifications.cancelScheduledNotificationAsync(n.identifier);
  }
  for (const r of wanted.values()) {
    await Notifications.scheduleNotificationAsync({
      identifier: r.id,
      content: { title: r.title, body: i18n.t('reminders.body'), data: { taskId: r.taskId, at: r.at }, sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.at, channelId: Platform.OS === 'android' ? CHANNEL : undefined },
    });
  }
}

let running: Promise<void> | null = null;
let again = false;

/** Runs `sync` one at a time; a request while one runs runs once more after it. Failures wait for the next request. */
export function syncReminders(timeZone: string): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  running = sync(timeZone)
    .catch(() => undefined)
    .finally(() => {
      running = null;
      if (again) {
        again = false;
        void syncReminders(timeZone);
      }
    });
  return running;
}

/** On sign-out: this user's reminders leave the phone. */
export async function clearReminders(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(scheduled.filter((n) => n.identifier.startsWith(PREFIX)).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
}
