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
  | 'ownershipReceived'
  | 'assignmentCompleted'
  | 'taskDeleted'
  | 'taskHeld'
  | 'taskResumed'
  | 'commented'
  | 'mentioned'
  | 'joinedByLink';

/**
 * One notification (GET /notifications). Names are read when listed, so a renamed task shows its current title;
 * `subject` is the team's or task list's name as it was. `details`: a reject reason, a new due date, a role or a comment's start.
 */
export interface Notification {
  id: Id;
  kind: NotificationKind;
  teamId?: Id | null;
  taskListId?: Id | null;
  subject?: string | null;
  taskId?: Id | null;
  taskTitle?: string | null;
  actorId: Id;
  actorName?: string | null;
  otherUserId?: Id | null;
  otherUserName?: string | null;
  details?: string | null;
  /** Commented, Mentioned (D92): the comment, where the task opens. */
  commentId?: Id | null;
  createdAt: IsoDateTime;
  readAt?: IsoDateTime | null;
}

export interface NotificationsPage {
  items: Notification[];
  nextCursor: string | null;
}
