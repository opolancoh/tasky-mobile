import type { Home } from '@/data/tasks/types';

import { AskRow, FollowUpRow, HoldRow, InvitationRow } from './StreamRows';
import type { LocalDate } from '@/core/types';

/** A request on Home (M105): an invitation, a task to answer, a follow-up (D71, D100) or a hold whose Until came (D91). */
export type Request = { key: string } & ({ kind: 'invitation'; invitation: Home['requests']['invitations'][number] } | { kind: 'ask' | 'follow' | 'hold'; task: Home['requests']['toAnswer'][number] });

/** Home's requests in order (invitations, answers, follow-ups, holds), as GET /home brings them (up to 20, D107). */
export function homeRequests(data: Home): Request[] {
  const r = data.requests;
  return [
    ...r.invitations.map((invitation) => ({ key: `v-${invitation.id}`, kind: 'invitation' as const, invitation })),
    ...r.toAnswer.map((task) => ({ key: `a-${task.id}`, kind: 'ask' as const, task })),
    ...r.followUp.map((task) => ({ key: `f-${task.id}`, kind: 'follow' as const, task })),
    ...r.holds.map((task) => ({ key: `h-${task.id}`, kind: 'hold' as const, task })),
  ];
}

/** One request on Home, its row as in See all. A request leaves only when answered (M105: no swipe to dismiss). */
export function RequestRow({ request, today }: { request: Request; today: LocalDate }) {
  return request.kind === 'invitation' ? <InvitationRow invitation={request.invitation} />
    : request.kind === 'ask' ? <AskRow task={request.task} today={today} />
    : request.kind === 'hold' ? <HoldRow task={request.task} />
    : <FollowUpRow task={request.task} />;
}
