import { focusManager, MutationCache, QueryCache, QueryClient, type Mutation } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';

import { isApiError, isConnectionError } from '@/core/http/problem';
import { toastError } from '@/shared/i18n/errors';
import { setConnectionRetry, showCantConnect } from '@/shared/network/cantConnect';

/** Refetch what's on screen when the app comes back to the foreground. */
AppState.addEventListener('change', (state) => {
  if (Platform.OS !== 'web') focusManager.setFocused(state === 'active');
});

/** Mutations run again by Can't connect's Try again: failing again shows the capsule again (M90). */
const retried = new WeakSet<Mutation<unknown, unknown, unknown, unknown>>();

export const queryClient = new QueryClient({
  // A mutation with `meta.toastError` (quick toggles, M56) shows its error as a toast: the data layer has no UI of its own.
  // One that couldn't reach Azignia becomes what Can't connect's Try again repeats (M90); toastError shows the capsule.
  mutationCache: new MutationCache({
    onError: (error, variables, _ctx, mutation) => {
      if (isConnectionError(error)) {
        setConnectionRetry(() => {
          retried.add(mutation);
          mutation.execute(variables).catch(() => {});
        });
      }
      if (mutation.meta?.toastError || (isConnectionError(error) && retried.has(mutation))) toastError(error);
    },
  }),
  // A refresh of data already on screen that couldn't reach Azignia: the data stays, the capsule says so (M90). A screen
  // with nothing to show shows LoadError instead.
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (!isConnectionError(error) || query.state.data === undefined) return;
      showCantConnect(() => void queryClient.refetchQueries({ queryKey: query.queryKey, exact: true }));
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // The HTTP client already retries network errors and 5xx; a 4xx won't change on retry.
      retry: (count, error) => count < 1 && !(isApiError(error) && error.status >= 400 && error.status < 500),
    },
    mutations: { retry: false },
  },
});
