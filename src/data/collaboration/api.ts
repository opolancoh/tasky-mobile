import type { Id } from '@/core/types';

import { http } from '../http';
import type { NotificationSettings, NotificationsPage } from './types';

export const collaborationApi = {
  /** GET /notifications: newest first, last 90 days, keyset-paged; `unread` keeps only unread ones (D67). */
  notifications: (limit: number, unread?: boolean, cursor?: string) =>
    http().get<NotificationsPage>('/notifications', { query: { limit, unread: unread || undefined, cursor } }),

  /** GET /notifications/unread-count. */
  unreadCount: () => http().get<{ count: number }>('/notifications/unread-count'),

  /** POST /notifications:mark-read: some, or all of them (204). */
  markRead: (ids: Id[] | 'all') => http().post('/notifications:mark-read', { body: ids === 'all' ? { all: true } : { ids } }),

  /** PUT /me/devices/{installId} (204): this phone's Expo push token, tied to the current sign-in (D97). Again when the token changes. */
  registerDevice: (installId: string, platform: 'ios' | 'android', token: string) => http().put(`/me/devices/${installId}`, { body: { platform, token } }),

  /** DELETE /me/devices/{installId} (204): no more pushes here; before signing out. */
  removeDevice: (installId: string, accessToken?: string) => http().delete(`/me/devices/${installId}`, accessToken ? { accessToken } : undefined),

  /** GET /me/notification-settings: the defaults (all on, no quiet hours) until changed. */
  notificationSettings: () => http().get<NotificationSettings>('/me/notification-settings'),

  /** PATCH /me/notification-settings: only the fields sent change; answers with all of them. */
  updateNotificationSettings: (body: Partial<NotificationSettings>) => http().patch<NotificationSettings>('/me/notification-settings', { body }),
};
