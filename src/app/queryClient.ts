import { focusManager, QueryClient } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';

import { isApiError } from '@/core/http/problem';

/** Refetch what's on screen when the app comes back to the foreground. */
AppState.addEventListener('change', (state) => {
  if (Platform.OS !== 'web') focusManager.setFocused(state === 'active');
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // The HTTP client already retries network errors and 5xx; a 4xx won't change on retry.
      retry: (count, error) => count < 1 && !(isApiError(error) && error.status >= 400 && error.status < 500),
    },
    mutations: { retry: false },
  },
});
