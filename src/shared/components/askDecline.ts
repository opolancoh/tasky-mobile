import type { TFunction } from 'i18next';

import { taskLimits } from '@/data/tasks/types';
import { askReason } from '@/shared/ui';

/**
 * Declining a task given to the caller (M101), from Task detail or Home's Requests: the reason sheet, its field optional.
 * Resolves the reason ('' when none), or null when cancelled.
 */
export const askDecline = (t: TFunction, name: string) =>
  askReason({
    title: t('assign.declineTitle'),
    message: t('assign.declineMessage', { name }),
    confirmLabel: t('assign.decline'),
    cancelLabel: t('common.cancel'),
    placeholder: t('assign.declinePlaceholder'),
    maxLength: taskLimits.declineReasonMax,
  });
