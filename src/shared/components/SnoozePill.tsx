import { useTranslation } from 'react-i18next';

import { nowIn } from '@/core/dates/localDate';
import { snoozeUntil, type SnoozeId } from '@/core/dates/reminders';
import type { Id } from '@/core/types';
import { useSnoozeReminder } from '@/data/tasks/mutations';
import { useMe } from '@/data/tenancy/queries';
import { chooseAction, Pill } from '@/shared/ui';

const CHOICES: SnoozeId[] = ['tenMinutes', 'oneHour', 'tomorrow'];

/** Snooze on a reminder that rang and isn't done (D110, M114): the banner's choices; it keeps its own time. Only on those rows. */
export function SnoozePill({ taskId }: { taskId: Id }) {
  const { t } = useTranslation();
  const timeZone = useMe().data?.timeZone;
  const snooze = useSnoozeReminder();
  const label = (id: SnoozeId) => t(id === 'tomorrow' ? 'reminders.tomorrowMorning' : `reminders.${id}`);
  const choose = async () => {
    const i = await chooseAction({ title: t('reminders.snooze'), actions: CHOICES.map((id) => ({ label: label(id), icon: 'clock' })), cancelLabel: t('common.cancel') });
    if (i === null || !timeZone) return;
    snooze.mutate({ taskId, until: snoozeUntil(CHOICES[i]!, nowIn(timeZone)) });
  };
  return <Pill label={t('reminders.snooze')} tone="quiet" onPress={() => void choose()} busy={snooze.isPending} />;
}
