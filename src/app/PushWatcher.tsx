import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import type { Id } from '@/core/types';
import { collaborationApi } from '@/data/collaboration/api';
import { collaborationKeys } from '@/data/collaboration/keys';
import { useUnreadCount } from '@/data/collaboration/queries';
import type { NotificationKind } from '@/data/collaboration/types';
import { tasksApi } from '@/data/tasks/api';
import { taskKeys } from '@/data/tasks/keys';
import { HOME_PREVIEW } from '@/data/tasks/queries';
import { activityState, openActivityGo } from '@/shared/components/useActivityState';
import { askForNotifications, readNotificationPermission, useNotificationPermission } from '@/shared/notifications/permission';
import { pushSupported, registerPush } from '@/shared/notifications/push';
import { isPush } from '@/shared/notifications/reminders';
import { useSessionStore } from '@/shared/session/sessionStore';

import { navigationRef } from './LinkWatcher';

/**
 * A mutation that makes notifications worth allowing (D97): `meta.asksNotifications(variables, me)` true after it
 * succeeds shows our sheet (joining or creating a team or shared list, giving a task to someone).
 */
type AsksNotifications = (variables: unknown, me: Id | null) => boolean;

type Navigate = (screen: string, params?: object) => void;

/** Runs `open` once the navigator is ready (a tap can arrive before it is, at launch). */
function whenReady(open: (navigate: Navigate) => void) {
  const go = () => {
    if (!navigationRef.isReady()) return false;
    open(navigationRef.navigate as Navigate);
    return true;
  };
  if (go()) return;
  const timer = setInterval(() => go() && clearInterval(timer), 200);
}

/**
 * A tapped push opens what its Activity row opens (M58), from the same queries (fresh), and marks it read; when there's
 * nowhere to go, Activity. A tapped reminder opens its task.
 */
async function openTapped(data: Record<string, unknown>, queryClient: QueryClient) {
  if (!isPush(data)) {
    if (typeof data.taskId === 'string') whenReady((navigate) => navigate('TaskDetail', { taskId: data.taskId }));
    return;
  }
  const id = (key: string) => (typeof data[key] === 'string' ? (data[key] as Id) : null);
  void collaborationApi.markRead([id('notificationId')!]).then(() => queryClient.invalidateQueries({ queryKey: collaborationKeys.all })).catch(() => undefined);
  const fetch = <T,>(queryKey: readonly unknown[], queryFn: () => Promise<T>) => queryClient.fetchQuery({ queryKey, queryFn }).catch(() => undefined);
  const [invitations, taskLists, teams, home] = await Promise.all([
    fetch(taskKeys.invitations, tasksApi.invitations),
    fetch(taskKeys.taskLists, tasksApi.taskLists),
    fetch(taskKeys.teams, tasksApi.teams),
    fetch(taskKeys.home, () => tasksApi.home(HOME_PREVIEW)),
  ]);
  const state = activityState(
    { kind: data.kind as NotificationKind, taskId: id('taskId'), commentId: id('commentId'), taskListId: id('taskListId'), teamId: id('teamId') },
    { invitations, taskLists, teams, home },
  );
  whenReady((navigate) => (state ? openActivityGo(navigate, state.go) : navigate('Activity')));
}

/**
 * Push on this phone (D97), mounted while signed in: registers the token (at launch, on coming back, once allowed, when
 * it changes); with the app open a push only refreshes the bell and the screens; keeps the icon's badge at the unread
 * count; opens what a tapped push or reminder is about; and shows our sheet after a change that makes notifications worth it.
 */
export function PushWatcher() {
  const queryClient = useQueryClient();
  const permission = useNotificationPermission((s) => s.status);
  const unread = useUnreadCount().data?.count;

  useEffect(() => {
    void readNotificationPermission();
    const app = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      void readNotificationPermission();   // maybe changed in Settings
      void registerPush().catch(() => undefined);
    });
    const token = Notifications.addPushTokenListener(() => void registerPush().catch(() => undefined));
    return () => {
      app.remove();
      token.remove();
    };
  }, []);

  // Signed in, or just allowed: register (again, for this user).
  useEffect(() => {
    if (permission === 'granted') void registerPush(true).catch(() => undefined);
  }, [permission]);

  useEffect(() => {
    const received = Notifications.addNotificationReceivedListener((n) => {
      if (!isPush(n.request.content.data)) return;
      void queryClient.invalidateQueries({ queryKey: collaborationKeys.all });
      void queryClient.invalidateQueries({ queryKey: taskKeys.views });
    });
    // Opened by tapping one while closed (or signed out: it waits for sign-in), then any tap while running.
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      void openTapped(response.notification.request.content.data ?? {}, queryClient);
      void Notifications.clearLastNotificationResponseAsync();
    });
    const tapped = Notifications.addNotificationResponseReceivedListener((response) => void openTapped(response.notification.request.content.data ?? {}, queryClient));
    return () => {
      received.remove();
      tapped.remove();
    };
  }, [queryClient]);

  useEffect(() => {
    if (unread !== undefined && pushSupported && permission === 'granted') void Notifications.setBadgeCountAsync(unread).catch(() => undefined);
  }, [unread, permission]);

  useEffect(
    () =>
      queryClient.getMutationCache().subscribe((event) => {
        if (event.type !== 'updated' || event.action.type !== 'success') return;
        const asks = event.mutation.options.meta?.asksNotifications as AsksNotifications | undefined;
        if (asks?.(event.mutation.state.variables, useSessionStore.getState().userId)) void askForNotifications();
      }),
    [queryClient],
  );

  return null;
}
