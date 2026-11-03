import { useTranslation } from 'react-i18next';

import type { TaskList } from '@/data/tasks/types';

/** A list's kind in words (M130, E42): Private, Shared or Team · Family; nothing for Personal. */
export function useListKind() {
  const { t } = useTranslation();
  return (c: TaskList) => c.isInbox ? undefined
    : c.sharing === 'private' ? t('taskLists.kind.private')
    : c.sharing === 'shared' ? t('taskLists.kind.shared')
    : t('taskLists.kind.team', { name: c.team?.name ?? '' });
}
