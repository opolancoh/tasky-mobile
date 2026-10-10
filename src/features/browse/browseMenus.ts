import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { useArchiveCollection, useDeleteCollection, useDeleteTag, useDeleteTeam, useRemoveMember } from '@/data/tasks/mutations';
import { useTeams } from '@/data/tasks/queries';
import type { Collection, Tag, Team } from '@/data/tasks/types';
import { useMe } from '@/data/tenancy/queries';
import { errorMessage } from '@/shared/i18n/errors';
import { chooseAction, confirm, useToast, type ActionChoice } from '@/shared/ui';

import { canInvite, canLeave, canManage } from './browseSections';
import { useShowBrowseSheet } from './browseSheetStore';

type Item = ActionChoice & { run(): void };

/** Shows a native menu of `items` and runs the one picked. */
async function open(title: string, items: (Item | false)[], cancelLabel: string) {
  const list = items.filter((x): x is Item => !!x);
  const i = await chooseAction({ title, actions: list, cancelLabel });
  if (i !== null) list[i].run();
}

const toastError = (e: unknown) => useToast.getState().show({ message: errorMessage(e) });

/**
 * The menus Browse opens from a long press on a row, or from ••• on a list or team (M38): only what the user's role
 * allows (roles doc). Deletes and leaving ask first (`confirm`). `onGone` runs after the thing left the user's Browse
 * (e.g. go back from its screen).
 */
export function useBrowseMenus() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const me = useMe().data;
  const teams = useTeams().data ?? [];
  const showSheet = useShowBrowseSheet();
  const archive = useArchiveCollection();
  const removeList = useDeleteCollection();
  const removeTeam = useDeleteTeam();
  const removeMember = useRemoveMember();
  const removeTag = useDeleteTag();
  const cancel = t('common.cancel');

  const listMenu = (c: Collection, onGone?: () => void) => {
    if (c.isInbox) return open(t('browse.inbox'), [{ label: t('browse.menu.sort'), run: () => showSheet({ kind: 'list', id: c.id }) }], cancel);
    const team = c.team ? teams.find((x) => x.id === c.team!.id) : undefined;
    const leave = canLeave(c, team, me?.id);
    return open(c.name, [
      { label: t('browse.menu.editList'), run: () => showSheet({ kind: 'list', id: c.id }) },
      { label: t(c.sharing === 'private' ? 'browse.menu.share' : canInvite(c, team) ? 'browse.menu.peopleInvite' : 'browse.menu.people'), run: () => navigation.navigate('People', { kind: 'collection', id: c.id }) },
      canManage(c) && {
        label: t('browse.menu.archive'),
        run: () => archive.mutate({ collection: c, archive: true }, {
          onSuccess: (archived) => {
            onGone?.();
            useToast.getState().show({ message: t('browse.archived', { name: c.name }), action: { label: t('common.undo'), onPress: () => archive.mutate({ collection: archived, archive: false }) } });
          },
          onError: toastError,
        }),
      },
      canManage(c) && {
        label: t('browse.menu.deleteList'),
        destructive: true,
        run: async () => {
          const ok = await confirm({ title: t('browse.deleteListTitle', { name: c.name }), message: t(c.sharing === 'private' ? 'browse.deleteListBody' : 'browse.deleteSharedListBody', { count: c.openTasks ?? 0 }), confirmLabel: t('browse.menu.deleteList'), cancelLabel: cancel });
          if (ok) removeList.mutate(c, { onSuccess: () => { onGone?.(); useToast.getState().show({ message: t('browse.deleted', { name: c.name }) }); }, onError: toastError });
        },
      },
      leave && !!me && {
        label: t('browse.menu.leaveList'),
        destructive: true,
        run: async () => {
          const ok = await confirm({ title: t('browse.leaveTitle', { name: c.name }), message: t('browse.leaveListBody', { name: c.owner.displayName }), confirmLabel: t('browse.menu.leaveList'), cancelLabel: cancel });
          if (ok) removeMember.mutate({ of: { kind: 'collection', id: c.id }, userId: me.id }, { onSuccess: () => { onGone?.(); useToast.getState().show({ message: t('browse.left', { name: c.name }) }); }, onError: toastError });
        },
      },
    ], cancel);
  };

  const teamMenu = (team: Team, onGone?: () => void) => {
    const owner = team.role === 'owner';
    return open(team.name, [
      { label: t(owner || team.role === 'admin' ? 'browse.menu.peopleInvite' : 'browse.menu.people'), run: () => navigation.navigate('People', { kind: 'team', id: team.id }) },
      { label: t('browse.menu.newListIn', { name: team.name }), run: () => showSheet({ kind: 'list', teamId: team.id }) },
      owner && { label: t('browse.menu.renameTeam'), run: () => showSheet({ kind: 'team', id: team.id }) },
      owner && {
        label: t('browse.menu.deleteTeam'),
        destructive: true,
        run: async () => {
          const ok = await confirm({ title: t('browse.deleteTeamTitle', { name: team.name }), message: t('browse.deleteTeamBody'), confirmLabel: t('browse.menu.deleteTeam'), cancelLabel: cancel });
          if (ok) removeTeam.mutate(team, { onSuccess: () => { onGone?.(); useToast.getState().show({ message: t('browse.deleted', { name: team.name }) }); }, onError: toastError });
        },
      },
      !owner && !!me && {
        label: t('browse.menu.leaveTeam'),
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
      { label: t('browse.menu.editTag'), run: () => showSheet({ kind: 'tag', name: tag.name }) },
      {
        label: t('browse.menu.deleteTag'),
        destructive: true,
        run: async () => {
          const ok = await confirm({ title: t('browse.deleteTagTitle', { name: tag.name }), message: t('browse.deleteTagBody'), confirmLabel: t('browse.menu.deleteTag'), cancelLabel: cancel });
          if (ok) removeTag.mutate(tag.name, { onSuccess: () => { onGone?.(); useToast.getState().show({ message: t('browse.deleted', { name: `#${tag.name}` }) }); }, onError: toastError });
        },
      },
    ], cancel);

  return { listMenu, teamMenu, tagMenu };
}
