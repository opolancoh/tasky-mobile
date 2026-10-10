import type { Id } from '@/core/types';
import type { Collection, Team } from '@/data/tasks/types';

/** Browse's groups (M38): the Inbox, the user's lists, other people's lists outside their teams, and each team's lists. */
export interface BrowseGroups {
  inbox: Collection | undefined;
  mine: Collection[];
  shared: Collection[];
  /** A team's lists, in the user's order. */
  byTeam: Map<Id, Collection[]>;
}

/**
 * Splits GET /collections (Inbox first, then the user's order) into Browse's groups. A list in a team the user is in
 * goes with the team; a guest's list (in a team they're not in) is "shared with me".
 */
export function groupCollections(collections: Collection[], teams: Team[], meId: Id | undefined): BrowseGroups {
  const teamIds = new Set(teams.map((t) => t.id));
  const groups: BrowseGroups = { inbox: undefined, mine: [], shared: [], byTeam: new Map() };
  for (const c of collections) {
    if (c.isInbox) groups.inbox = c;
    else if (c.team && teamIds.has(c.team.id)) groups.byTeam.set(c.team.id, [...(groups.byTeam.get(c.team.id) ?? []), c]);
    else if (c.owner.id === meId) groups.mine.push(c);
    else groups.shared.push(c);
  }
  return groups;
}

/** A team's open tasks: the sum of its lists' counts. */
export const openInTeam = (groups: BrowseGroups, teamId: Id) => (groups.byTeam.get(teamId) ?? []).reduce((n, c) => n + (c.openTasks ?? 0), 0);

/** Every collection id with `id` moved one place up (-1) or down (1) among `group`, for POST /collections:reorder. */
export function moveInOrder(all: Id[], group: Id[], id: Id, by: -1 | 1): Id[] {
  const neighbour = group[group.indexOf(id) + by];
  if (!neighbour) return all;
  const next = [...all];
  const a = next.indexOf(id), b = next.indexOf(neighbour);
  [next[a], next[b]] = [next[b], next[a]];
  return next;
}

/** Who may do what to a list (tasky-api/docs/roles-and-permissions.md). */
export const canManage = (c: Collection) => !c.isInbox && (c.role === 'owner' || c.role === 'admin');
/** Invite: a list's owner outside a team; in a team, its owner and admins (read from the team). */
export const canInvite = (c: Collection, team: Team | undefined) => !c.isInbox && (c.team ? !!team && team.role !== 'member' : c.role === 'owner');
/** Leave: someone else's list outside the user's teams (shared with them, or as a guest). */
export const canLeave = (c: Collection, team: Team | undefined, meId: Id | undefined) => !c.isInbox && !team && c.owner.id !== meId;
