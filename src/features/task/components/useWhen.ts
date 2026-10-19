import { useTranslation } from 'react-i18next';

import { addDays, formatInstant, todayIn } from '@/core/dates/localDate';
import { useMe } from '@/data/tenancy/queries';
import { useDateLabels } from '@/shared/hooks/useDateLabels';

/** When a comment or a change happened, in the profile's time zone: "8:40 AM" today, "Yesterday, 7:12 PM", "Wed, Oct 14, 8:15 PM". */
export function useWhen() {
  const { t, i18n } = useTranslation();
  const me = useMe().data;
  const today = me ? todayIn(me.timeZone) : undefined;
  const labels = useDateLabels(today);
  return (iso: string) => {
    if (!me) return '';
    const day = formatInstant(iso, 'en-CA', me.timeZone, { year: 'numeric', month: '2-digit', day: '2-digit' });   // YYYY-MM-DD in the profile's zone
    const time = formatInstant(iso, i18n.language, me.timeZone, { hour: 'numeric', minute: '2-digit' });
    return day === today ? time : today && day === addDays(today, -1) ? `${t('dates.yesterday')}, ${time}` : `${labels.day(day)}, ${time}`;
  };
}
