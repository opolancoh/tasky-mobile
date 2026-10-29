import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import { instantIn } from '@/core/dates/localDate';
import { tasksApi } from '@/data/tasks/api';
import i18n from '@/shared/i18n/i18n';

import { askForNotifications, readNotificationPermission } from './permission';

/** iOS keeps 64 pending notifications; the nearest 50 leave room (04-notifications.md). */
const MAX = 50;
const PREFIX = 'reminder-';
const CHANNEL = 'reminders';
/** A repeating reminder's next times scheduled at once (D110): it keeps ringing while the app stays closed. */
const OCCURRENCES = 5;
/** The banner's actions (M114): Done and three snoozes; each opens the app, which applies it (PushWatcher). */
export const REMINDER_CATEGORY = 'reminder';
export const REMINDER_ACTIONS = ['done', 'tenMinutes', 'oneHour', 'tomorrow'] as const;
export type ReminderAction = (typeof REMINDER_ACTIONS)[number];

/**
 * Reminders show while the app is open too, as a banner with sound. A push (D97) doesn't: with the app open the bell and
 * the screens refresh instead (usePush).
 */
Notifications.setNotificationHandler({
  handleNotification: async (n) => {
    const shown = !isPush(n.request.content.data);
    return { shouldShowBanner: shown, shouldShowList: shown, shouldPlaySound: shown, shouldSetBadge: false };
  },
});

/** A push from the API carries its notification's id; a reminder doesn't. */
export const isPush = (data: Record<string, unknown> | undefined | null) => typeof data?.notificationId === 'string';

/**
 * Whether reminders may alert. With a reminder and the phone never asked, our sheet asks first (D97), never at launch;
 * once allowed, the next sync schedules them.
 */
async function allowed(hasReminders: boolean): Promise<boolean> {
  const status = await readNotificationPermission();
  if (status === 'undetermined' && hasReminders) void askForNotifications();
  return status === 'granted';
}

/**
 * Makes the phone's scheduled notifications match the user's reminders (D11, 04-notifications.md): the nearest 50 from
 * GET /me/reminders (a repeating reminder's next times too, D110), each firing at its date and time in the profile's time
 * zone, or when it was snoozed to. Adds what is missing, replaces what changed, removes the rest. Safe to run often.
 */
async function sync(timeZone: string): Promise<void> {
  const { items } = await tasksApi.myReminders(MAX, undefined, OCCURRENCES);
  const now = Date.now();
  const wanted = new Map(
    items
      .map((r) => {
        const [date, time] = r.snoozedUntil ? [r.snoozedUntil.slice(0, 10), r.snoozedUntil.slice(11, 16)] : [r.date, r.time];
        return { id: `${PREFIX}${r.taskId}-${r.date}`, taskId: r.taskId, kind: r.kind, title: r.title, at: instantIn(date, time, timeZone).getTime() };
      })
      .filter((r) => r.at > now)
      .slice(0, MAX)
      .map((r) => [r.id, r]),
  );
  if (!(await allowed(wanted.size > 0))) return;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, { name: i18n.t('reminders.channel'), importance: AndroidImportance.HIGH });
  }
  const titles: Record<ReminderAction, string> = { done: i18n.t('reminders.done'), tenMinutes: i18n.t('reminders.tenMinutes'), oneHour: i18n.t('reminders.oneHour'), tomorrow: i18n.t('reminders.tomorrowMorning') };
  await Notifications.setNotificationCategoryAsync(REMINDER_CATEGORY, REMINDER_ACTIONS.map((id) => ({ identifier: id, buttonTitle: titles[id], options: { opensAppToForeground: true } })));

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
      content: { title: r.title, body: i18n.t('reminders.body'), data: { taskId: r.taskId, kind: r.kind, at: r.at }, sound: true, categoryIdentifier: REMINDER_CATEGORY },
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
