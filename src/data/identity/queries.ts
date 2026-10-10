import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { identityApi } from './api';

const sessionsKey = ['sessions'] as const;

/** The devices where the user is signed in (Settings, M41). */
export const useSessions = () => useQuery({ queryKey: sessionsKey, queryFn: identityApi.sessions });

/** Signs one other device out; the list refetches. */
export function useRevokeSession() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (id: string) => identityApi.revokeSession(id), onSettled: () => queryClient.invalidateQueries({ queryKey: sessionsKey }) });
}
