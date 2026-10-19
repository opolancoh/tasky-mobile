import { useTranslation } from 'react-i18next';

import { todayIn } from '@/core/dates/localDate';
import type { HistoryEntry, UserRef } from '@/data/tasks/types';
import { useMe } from '@/data/tenancy/queries';
import { useDateLabels } from '@/shared/hooks/useDateLabels';

/**
 * A change in the reader's language (D94, the hub's A): who ("You", a name; none for what nobody did by hand) and the
 * sentence ("moved the due date from Oct 17 to Oct 22"). Lists by their name then (the Inbox by its own); people by name now.
 */
export function useHistoryText() {
  const { t } = useTranslation();
  const me = useMe().data;
  const labels = useDateLabels(me ? todayIn(me.timeZone) : undefined);

  return (h: HistoryEntry): { who: string | null; text: string } => {
    const name = (u: UserRef | null | undefined) => (!u ? t('notifications.someone') : u.id === me?.id ? t('history.you') : u.displayName || t('notifications.someone'));
    const list = (label: string | null | undefined) => label ?? t('browse.inbox');
    const day = (d: string | null | undefined) => (d ? labels.day(d) : '');
    const who = h.kind === 'assigneeLeft' || h.kind === 'assigneeDeactivated' ? null : h.actor ? (h.actor.id === me?.id ? t('history.you') : h.actor.displayName || t('notifications.someone')) : t('history.nobody');
    // Spanish words the user's own changes in the second person ("la creaste"): i18next's context, `_you` keys.
    const mine = !!h.actor && h.actor.id === me?.id;
    const tt = (key: string, options: Record<string, string> = {}) => t(key, { ...options, context: mine ? 'you' : undefined });
    const text = (() => {
      switch (h.kind) {
        case 'created': return tt('history.created', { list: list(h.toLabel) });
        case 'renamed': return tt('history.renamed', { from: h.from ?? '', to: h.to ?? '' });
        case 'dueChanged': return !h.to ? tt('history.dueRemoved') : !h.from ? tt('history.dueSet', { to: day(h.to) }) : tt('history.dueMoved', { from: day(h.from), to: day(h.to) });
        case 'importance': return tt(h.to === 'true' ? 'history.flagged' : 'history.unflagged');
        case 'moved': return tt('history.moved', { from: list(h.fromLabel), to: list(h.toLabel) });
        case 'assigned':
          return !h.toUser ? tt('history.unassigned', { from: name(h.fromUser) })
            : h.fromUser ? tt('history.reassigned', { from: name(h.fromUser), to: name(h.toUser) })
            : h.toUser.id === h.actor?.id ? tt('history.tookIt') : tt('history.assigned', { to: name(h.toUser) });
        case 'declined': return h.details ? tt('history.declinedReason', { reason: h.details }) : tt('history.declined');
        case 'completed': return h.to ? tt('history.completedNext', { to: day(h.to) }) : tt('history.completed');
        case 'skipped': return tt('history.skipped', { to: day(h.to) });
        case 'held': return tt('history.held', { reason: h.details ?? '' });
        case 'assigneeLeft': return h.details ? tt('history.assigneeLeft', { name: name(h.fromUser), place: h.details }) : tt('history.assigneeLost', { name: name(h.fromUser) });
        case 'assigneeDeactivated': return tt('history.assigneeDeactivated', { name: name(h.fromUser) });
        default: return tt(`history.${h.kind}`);
      }
    })();
    return { who, text };
  };
}
