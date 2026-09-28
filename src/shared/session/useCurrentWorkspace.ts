import { useWorkspaces } from '@/data/workspaces/queries';

/**
 * The workspace every view shows. v1 for now: the personal workspace (first in /workspaces).
 * Choosing a team workspace comes with the workspace switcher.
 */
export function useCurrentWorkspace() {
  const { data } = useWorkspaces();
  return data?.[0];
}
