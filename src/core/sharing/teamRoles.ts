/** What each role may do in a team (D125, D127; azignia-api/docs/roles-and-permissions.md), for People's roles table. */
export type RoleCell = 'yes' | 'no' | 'oneList';

export const TEAM_ROLES: readonly { key: string; owner: RoleCell; member: RoleCell; guest: RoleCell }[] = [
  { key: 'seeLists', owner: 'yes', member: 'yes', guest: 'oneList' },
  { key: 'tasks', owner: 'yes', member: 'yes', guest: 'yes' },
  { key: 'createLists', owner: 'yes', member: 'yes', guest: 'no' },
  { key: 'invite', owner: 'yes', member: 'no', guest: 'no' },
  { key: 'roles', owner: 'yes', member: 'no', guest: 'no' },
  { key: 'lists', owner: 'yes', member: 'no', guest: 'no' },
  { key: 'team', owner: 'yes', member: 'no', guest: 'no' },
];
