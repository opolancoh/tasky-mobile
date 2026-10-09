import type { Id } from '@/core/types';

import { http } from '../http';
import type { NotificationsPage } from './types';

export const collaborationApi = {
  /** GET /notifications: newest first, last 90 days, keyset-paged; `unread` keeps only unread ones (D67). */
  notifications: (limit: number, unread?: boolean, cursor?: string) =>
    http().get<NotificationsPage>('/notifications', { query: { limit, unread: unread || undefined, cursor } }),

  /** GET /notifications/unread-count. */
  unreadCount: () => http().get<{ count: number }>('/notifications/unread-count'),

  /** POST /notifications:mark-read: some, or all of them (204). */
  markRead: (ids: Id[] | 'all') => http().post('/notifications:mark-read', { body: ids === 'all' ? { all: true } : { ids } }),
};
