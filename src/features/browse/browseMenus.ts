import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { useArchiveTaskList, useDeleteTaskList, useDeleteTag, useDeleteTeam, useRemoveMember, useUpdateTaskList } from '@/data/tasks/mutations';
import { useTeams } from '@/data/tasks/queries';
import type { TaskList, Tag, Team } from '@/data/tasks/types';
import { useMe } from '@/data/tenancy/queries';
import { toastError } from '@/shared/i18n/errors';
import { chooseAction, confirm, useToast, type ActionChoice } from '@/shared/ui';

import { canInvite, canLeave, canManage, SORT_MODES } from './browseSections';
import { useShowBrowseSheet } from '@/shared/browseSheet/browseSheetStore';

type Item = ActionChoice & { run(): void };

/** Shows a menu of `items` (a sheet from the bottom, M64) and runs the one picked. */
async function open(title: string, items: (Item | false)[], cancelLabel: string) {
  const list = items.filter((x): x is Item => !!x);
  const i = await chooseAction({ title, actions: list, cancelLabel });
  if (i !== null) list[i].run();
}

/**
 * The menus Browse opens from a long press on a row, or from ••• on a list or team (M38, M64): only what the user's
 * role allows (roles doc). Sort opens its own menu, the current one checked. Deletes and leaving ask first (`confirm`). `onGone` runs after the thing left the user's Browse
 * (e.g. go back from its screen).
 */
export function useBrowseMenus() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const me = useMe().data;
  const teams = useTeams().data ?? [];
  const showSheet = useShowBrowseSheet();
  const archive = useArchiveTaskList();
  const removeList = useDeleteTaskList();
  const removeTeam = useDeleteTeam();
  const removeMember = useRemoveMember();
  const removeTag = useDeleteTag();
  const update = useUpdateTaskList();
  const cancel = t('common.cancel');

  const chooseSort = (c: TaskList) =>
    open(t('browse.menu.sort'), SORT_MODES.map((s) => ({
      label: t(`browse.sort.${s}`),
      selected: s === c.sortMode,
      run: () => s !== c.sortMode && update.mutate({ taskList: c, body: { sortMode: s } }, { onError: toastError }),
    })), cancel);

  const listMenu = (c: TaskList, onGone?: () => void) => {
    const sort: Item = { label: t('browse.menu.sort'), icon: { community: 'swap-vertical' }, value: t(`browse.sort.${c.sortMode}`), more: true, run: () => chooseSort(c) };
    if (c.isInbox) return open(t('browse.inbox'), [sort], cancel);
    const team = c.team ? teams.find((x) => x.id === c.team!.id) : undefined;
    const leave = canLeave(c, team, me?.id);
    return open(c.name, [
      { label: t('browse.menu.editList'), icon: 'edit-2', run: () => showSheet({ kind: 'list', id: c.id }) },
      sort,
      { label: t(c.sharing === 'private' ? 'browse.menu.share' : canInvite(c, team) ? 'browse.menu.peopleInvite' : 'browse.menu.people'), icon: c.sharing === 'private' ? 'user-plus' : 'users', run: () => navigation.navigate('People', { kind: 'taskList', id: c.id }) },
      canManage(c) && {
        label: t('browse.menu.archive'),
        icon: 'archive',
        run: () => archive.mutate({ taskList: c, archive: true }, {
          onSuccess: (archived) => {
            onGone?.();
            useToast.getState().show({ message: t('browse.archived', { name: c.name }), action: { label: t('common.undo'), onPress: () => archive.mutate({ taskList: archived, archive: false }) } });
          },
          onError: toastError,
        }),
      },
      canManage(c) && {
        label: t('browse.menu.deleteList'),
        icon: 'trash-2',
        destructive: true,
        run: async () => {
          const ok = await confirm({ title: t('browse.deleteListTitle', { name: c.name }), message: t(c.sharing === 'private' ? 'browse.deleteListBody' : 'browse.deleteSharedListBody', { count: c.openTasks ?? 0 }), confirmLabel: t('browse.menu.deleteList'), cancelLabel: cancel });
          if (ok) removeList.mutate(c, { onSuccess: () => { onGone?.(); useToast.getState().show({ message: t('browse.deleted', { name: c.name }) }); }, onError: toastError });
        },
      },
      leave && !!me && {
        label: t('browse.menu.leaveList'),
        icon: 'log-out',
        destructive: true,
        run: async () => {
          const ok = await confirm({ title: t('browse.leaveTitle', { name: c.name }), message: t('browse.leaveListBody', { name: c.owner.displayName }), confirmLabel: t('browse.menu.leaveList'), cancelLabel: cancel });
          if (ok) removeMember.mutate({ of: { kind: 'taskList', id: c.id }, userId: me.id }, { onSuccess: () => { onGone?.(); useToast.getState().show({ message: t('browse.left', { name: c.name }) }); }, onError: toastError });
        },
      },
    ], cancel);
  };

  /** The team's menu; `onTeam`: opened from the Team screen, which already has People (its line, add people), M76. */
  const teamMenu = (team: Team, onGone?: () => void, onTeam = false) => {
    const owner = team.role === 'owner';
    return open(`${team.name} · ${t(`browse.role.${team.role}`)}`, [
      { label: t('browse.newList'), icon: 'plus', run: () => showSheet({ kind: 'list', teamId: team.id }) },
      !onTeam && { label: t(owner || team.role === 'admin' ? 'browse.menu.peopleInvite' : 'browse.menu.people'), icon: 'users', run: () => navigation.navigate('People', { kind: 'team', id: team.id }) },
      owner && { label: t('browse.menu.renameTeam'), icon: 'edit-2', run: () => showSheet({ kind: 'team', id: team.id }) },
      owner && {
        label: t('browse.menu.deleteTeam'),
        icon: 'trash-2',
        destructive: true,
        run: async () => {
          const ok = await confirm({ title: t('browse.deleteTeamTitle', { name: team.name }), message: t('browse.deleteTeamBody'), confirmLabel: t('browse.menu.deleteTeam'), cancelLabel: cancel });
          if (ok) removeTeam.mutate(team, { onSuccess: () => { onGone?.(); useToast.getState().show({ message: t('browse.deleted', { name: team.name }) }); }, onError: toastError });
        },
      },
      !owner && !!me && {
        label: t('browse.menu.leaveTeam'),
        icon: 'log-out',
        destructive: true,
        run: async () => {
          const ok = await confirm({ title: t('browse.leaveTitle', { name: team.name }), message: t('browse.leaveTeamBody'), confirmLabel: t('browse.menu.leaveTeam'), cancelLabel: cancel });
          if (ok) removeMember.mutate({ of: { kind: 'team', id: team.id }, userId: me.id }, { onSuccess: () => { onGone?.(); useToast.getState().show({ message: t('browse.left', { name: team.name }) }); }, onError: toastError });
        },
      },
    ], cancel);
  };

  const tagMenu = (tag: Tag, onGone?: () => void) =>
    open(`#${tag.name}`, [
      { label: t('browse.menu.editTag'), icon: 'edit-2', run: () => showSheet({ kind: 'tag', name: tag.name }) },
      {
        label: t('browse.menu.deleteTag'),
        icon: 'trash-2',
        destructive: true,
        run: async () => {
          const ok = await confirm({ title: t('browse.deleteTagTitle', { name: tag.name }), message: t('browse.deleteTagBody'), confirmLabel: t('browse.menu.deleteTag'), cancelLabel: cancel });
          if (ok) removeTag.mutate(tag.name, { onSuccess: () => { onGone?.(); useToast.getState().show({ message: t('browse.deleted', { name: `#${tag.name}` }) }); }, onError: toastError });
        },
      },
    ], cancel);

  return { listMenu, teamMenu, tagMenu };
}
