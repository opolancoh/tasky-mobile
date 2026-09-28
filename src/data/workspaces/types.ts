import type { Id } from '@/core/types';

export type WorkspaceType = 'personal' | 'team';
export type MemberRole = 'owner' | 'admin' | 'member' | 'guest';
export type WorkspaceStatus = 'active' | 'readOnly';

/** An item of GET /workspaces: personal first, then team workspaces by name. */
export interface Workspace {
  id: Id;
  /** Never shown for the personal workspace. */
  name: string;
  type: WorkspaceType;
  /** The caller's role in it. */
  role: MemberRole;
  ownerId: Id;
  status: WorkspaceStatus;
}
