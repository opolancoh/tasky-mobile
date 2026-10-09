import type { Feather } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';

import { addDays, formatInstant, todayIn } from '@/core/dates/localDate';
import type { Notification } from '@/data/collaboration/types';
import { useMe } from '@/data/tenancy/queries';
import { useDateLabels } from '@/shared/hooks/useDateLabels';

type Icon = ComponentProps<typeof Feather>['name'];

const ICONS: Record<Notification['kind'], Icon> = {
  assigned: 'user', reassigned: 'user', unassigned: 'user', assignmentAccepted: 'user-check', assignmentRejected: 'user-x', assignmentDropped: 'user-x',
  taskCompleted: 'check-circle', taskMoved: 'corner-up-right', taskRescheduled: 'calendar',
  invited: 'users', invitationAccepted: 'users', removed: 'users', roleChanged: 'users', ownershipReceived: 'key',
};

/**
 * Words a notification in the app's language from what is stored (product: Notifications): "Ana declined Book flights:
 * Not this week", and when ("8:40 AM" today, "Yesterday", "Sat, Sep 26") in the profile's time zone.
 */
export function useNotificationText() {
  const { t, i18n } = useTranslation();
  const me = useMe().data;
  const today = me ? todayIn(me.timeZone) : undefined;
  const labels = useDateLabels(today);

  return (n: Notification): { line: string; when: string; icon: Icon } => {
    const actor = n.actorName || t('notifications.someone');
    const task = n.taskTitle || t('notifications.aTask');
    const subject = n.subject || '';
    const other = n.otherUserName || t('notifications.someone');
    const line =
      n.kind === 'assignmentRejected' && n.details ? t('notifications.assignmentRejectedReason', { actor, task, reason: n.details })
      : n.kind === 'taskRescheduled' ? (n.details ? t('notifications.taskRescheduled', { actor, task, date: labels.day(n.details) }) : t('notifications.dueRemoved', { actor, task }))
      : n.kind === 'roleChanged' ? t('notifications.roleChanged', { actor, subject, role: t(n.details === 'admin' ? 'notifications.admin' : 'notifications.member') })
      : t(`notifications.${n.kind}`, { actor, task, subject, other });

    let when = '';
    if (me) {
      const day = formatInstant(n.createdAt, 'en-CA', me.timeZone, { year: 'numeric', month: '2-digit', day: '2-digit' });   // YYYY-MM-DD in the profile's zone
      when = day === today
        ? formatInstant(n.createdAt, i18n.language, me.timeZone, { hour: 'numeric', minute: '2-digit' })
        : today && day === addDays(today, -1) ? t('dates.yesterday')
        : labels.day(day);
    }
    return { line, when, icon: ICONS[n.kind] ?? 'bell' };
  };
}
