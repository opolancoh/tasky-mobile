import type { Id } from '@/core/types';
import type { Notification } from '@/data/collaboration/types';
import { useHome, useInvitations, useTaskLists, useTeams } from '@/data/tasks/queries';
import type { Home, MembersOf, MyInvitation, TaskList, Team } from '@/data/tasks/types';

export type ActivityGo =
  | { to: 'invitation'; id: Id }
  | { to: 'task'; id: Id; commentId?: Id }
  | { to: 'taskList'; id: Id }
  | { to: 'team'; id: Id }
  | { to: 'people'; of: MembersOf };

/** Where a notification leads now (M58), or null when there is nowhere to go. `needs`: it waits for the user. */
export type ActivityState = { needs?: 'respond' | 'review' | 'confirm'; go: ActivityGo } | null;

const TASK_NEEDS: Partial<Record<Notification['kind'], { section: 'toAnswer' | 'followUp'; needs: 'respond' | 'review' | 'confirm' }>> = {
  assigned: { section: 'toAnswer', needs: 'respond' },
  assignmentRejected: { section: 'followUp', needs: 'review' },   // what happens to it now is the user's call (M102)
  assignmentDropped: { section: 'followUp', needs: 'respond' },
  assignmentCompleted: { section: 'followUp', needs: 'confirm' },
};

/** What a notification's state is read from: the queries Today already has (GET /home, the lists, the invitations). */
export interface ActivitySources {
  invitations?: MyInvitation[];
  taskLists?: TaskList[];
  teams?: Team[];
  home?: Home;
}

/** The fields a notification's state needs: a pushed one carries only these (D97). */
export type ActivityNotification = Pick<Notification, 'kind' | 'teamId' | 'taskListId' | 'taskId' | 'commentId'>;

/**
 * A notification's state from what the app already reads (M58): needs the user (an open invitation; a task still in
 * Today's to answer or follow-up sections), something to see (its task, list, team or people), or nowhere to go
 * (removed, deleted, an invitation no longer open, a list or team the user left). Same queries as Today (GET /home and
 * the lists), so no extra requests; a task past Home's first 20 requests shows as something to see. A tapped push asks it
 * too (shared/notifications/push.ts), so it opens what its Activity row opens.
 */
export function activityState(n: ActivityNotification, { invitations, taskLists, teams, home }: ActivitySources): ActivityState {
  const taskNeeds = TASK_NEEDS[n.kind];
  const inList = !!n.taskListId && !!taskLists?.some((l) => l.id === n.taskListId);
  const inTeam = !!n.teamId && !!teams?.some((x) => x.id === n.teamId);
  const subject: ActivityGo | null = n.taskListId ? (inList ? { to: 'taskList', id: n.taskListId } : null) : n.teamId && inTeam ? { to: 'team', id: n.teamId } : null;

  switch (n.kind) {
    case 'removed':
    case 'taskDeleted':
      return null;
    case 'invited': {
      const open = invitations?.find((x) => (n.taskListId ? x.taskListId === n.taskListId : x.teamId === n.teamId));
      if (open) return { needs: 'respond', go: { to: 'invitation', id: open.id } };
      return subject ? { go: subject } : null;
    }
    case 'invitationAccepted':
    case 'invitationDeclined':
      // An answer to an invitation opens what it was to (M92).
      return subject ? { go: subject } : null;
    case 'joinedByLink':
      return subject ? { go: { to: 'people', of: n.taskListId ? { kind: 'taskList', id: n.taskListId } : { kind: 'team', id: n.teamId! } } } : null;
    case 'roleChanged':
    case 'ownershipReceived':
      return subject ? { go: subject } : null;
    case 'unassigned':
      // Someone from outside the list loses the task with it (D70).
      return n.taskId && inList ? { go: { to: 'task', id: n.taskId } } : null;
    default: {
      if (!n.taskId) return subject ? { go: subject } : null;
      const waiting = taskNeeds && home?.requests[taskNeeds.section].some((t) => t.id === n.taskId);
      return { needs: waiting ? taskNeeds.needs : undefined, go: { to: 'task', id: n.taskId, ...(n.commentId ? { commentId: n.commentId } : {}) } };
    }
  }
}

/** The same for a row on screen, from the cached queries. */
export function useActivityState(n: Notification): ActivityState {
  const invitations = useInvitations().data;
  const taskLists = useTaskLists().data;
  const teams = useTeams().data;
  const home = useHome().data;
  return activityState(n, { invitations, taskLists, teams, home });
}

type Navigate = (screen: string, params?: object) => void;

/** Opens where a notification leads: its Activity row and a tapped push (D97; `fromPush`: a gone task opens Activity, M88). */
export function openActivityGo(navigate: Navigate, to: ActivityGo, fromPush = false) {
  if (to.to === 'invitation') navigate('Invitation', { invitationId: to.id });
  else if (to.to === 'task') navigate('TaskDetail', { taskId: to.id, commentId: to.commentId, ...(fromPush ? { fromPush } : {}) });
  else if (to.to === 'taskList') navigate('TaskList', { taskListId: to.id });
  else if (to.to === 'team') navigate('Team', { teamId: to.id });
  else navigate('People', to.of);
}
