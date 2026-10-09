/** Notifications (signing out clears the cache, so another user never sees these). */
export const collaborationKeys = {
  all: ['notifications'] as const,
  unread: ['notifications', 'unread'] as const,
  unreadCount: ['notifications', 'unread-count'] as const,
  list: ['notifications', 'list'] as const,
};
