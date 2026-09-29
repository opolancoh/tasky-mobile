import { useWorkspaces } from '@/data/workspaces/queries';

import { useSessionStore } from './sessionStore';

/**
 * The workspace every view shows: the one this user last chose on this device (saved), else the
 * personal workspace (first in /workspaces). The workspace switcher calls `chooseWorkspace`.
 */
export function useCurrentWorkspace() {
  const { data } = useWorkspaces();
  const chosen = useSessionStore((s) => (s.userId ? s.workspaceByUser[s.userId] : undefined));
  return data?.find((w) => w.id === chosen) ?? data?.[0];
}
