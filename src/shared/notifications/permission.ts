import * as Notifications from 'expo-notifications';
import { create } from 'zustand';

/**
 * The phone's one notification permission, for reminders (M42) and push (D97). `undetermined`: never asked; `denied`:
 * turned off (Me shows "Turn on in Settings").
 */
export type NotificationPermission = 'unknown' | 'undetermined' | 'granted' | 'denied';

export const useNotificationPermission = create<{ status: NotificationPermission; canAskAgain: boolean; set(status: NotificationPermission, canAskAgain: boolean): void }>()((set) => ({
  status: 'unknown',
  canAskAgain: true,
  set: (status, canAskAgain) => set({ status, canAskAgain }),
}));

const record = (p: Notifications.NotificationPermissionsStatus): NotificationPermission => {
  const status: NotificationPermission = p.granted ? 'granted' : p.status === 'undetermined' ? 'undetermined' : 'denied';
  useNotificationPermission.getState().set(status, p.canAskAgain);
  return status;
};

/** Reads the permission (at launch, when the app comes back from Settings). */
export async function readNotificationPermission(): Promise<NotificationPermission> {
  return record(await Notifications.getPermissionsAsync());
}

/**
 * Our sheet before the phone's dialog (D97): one line saying why, Turn on or Not now. Shown the first time it matters
 * (a reminder set, joining or creating a team or shared list, giving a task); after Not now it waits for the next time
 * it matters, once per launch.
 */
export const useNotificationAsk = create<{ visible: boolean; declined: boolean; show(): void; hide(declined: boolean): void }>()((set) => ({
  visible: false,
  declined: false,
  show: () => set({ visible: true }),
  hide: (declined) => set((s) => ({ visible: false, declined: s.declined || declined })),
}));

/** Asks, if the phone can still ask and the user hasn't said Not now since launch. */
export async function askForNotifications(): Promise<void> {
  const ask = useNotificationAsk.getState();
  if (ask.visible || ask.declined) return;
  const p = await Notifications.getPermissionsAsync();
  if (record(p) === 'undetermined' && p.canAskAgain) ask.show();
}

/** Turn on: the phone's own dialog. Granted, the reminders and push watchers react to the new status. */
export async function allowNotifications(): Promise<void> {
  useNotificationAsk.getState().hide(false);
  record(await Notifications.requestPermissionsAsync());
}
