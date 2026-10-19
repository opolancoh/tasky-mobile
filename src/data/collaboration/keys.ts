/** Notifications (signing out clears the cache, so another user never sees these). */
export const collaborationKeys = {
  all: ['notifications'] as const,
  unread: ['notifications', 'unread'] as const,
  unreadCount: ['notifications', 'unread-count'] as const,
  list: ['notifications', 'list'] as const,
};

/** Push settings (D97): apart from the notification list, so marking read doesn't refetch them. */
export const pushKeys = {
  settings: ['push', 'settings'] as const,
};
