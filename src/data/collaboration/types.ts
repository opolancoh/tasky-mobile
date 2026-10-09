import type { Id, IsoDateTime } from '@/core/types';

/** What happened; the app words it in the reader's language (product: Notifications). */
export type NotificationKind =
  | 'assigned'
  | 'reassigned'
  | 'unassigned'
  | 'assignmentAccepted'
  | 'assignmentRejected'
  | 'assignmentDropped'
  | 'taskCompleted'
  | 'taskMoved'
  | 'taskRescheduled'
  | 'invited'
  | 'invitationAccepted'
  | 'removed'
  | 'roleChanged'
  | 'ownershipReceived';

/**
 * One notification (GET /notifications). Names are read when listed, so a renamed task shows its current title;
 * `subject` is the team's or collection's name as it was. `details`: a reject reason, a new due date or a role.
 */
export interface Notification {
  id: Id;
  kind: NotificationKind;
  teamId?: Id | null;
  collectionId?: Id | null;
  subject?: string | null;
  taskId?: Id | null;
  taskTitle?: string | null;
  actorId: Id;
  actorName?: string | null;
  otherUserId?: Id | null;
  otherUserName?: string | null;
  details?: string | null;
  createdAt: IsoDateTime;
  readAt?: IsoDateTime | null;
}

export interface NotificationsPage {
  items: Notification[];
  nextCursor: string | null;
}
