import { useNavigation } from '@react-navigation/native';
import { create } from 'zustand';

import type { Id } from '@/core/types';

/** What the Browse sheet edits: a new or existing list (a new one maybe in a team), a new or renamed team, a tag. */
export type BrowseSheetTarget =
  | { kind: 'list'; id?: Id; teamId?: Id }
  | { kind: 'team'; id?: Id }
  | { kind: 'tag'; name: string };

/**
 * Which Browse sheet is open (M38). The sheet is mounted once, in App (sheets are overlays at the app root,
 * docs/performance.md); `session` changes on every `show()`, so each opening starts from the saved values.
 * Openers use `useShowBrowseSheet`, which opens a new list or team once created.
 */
export const useBrowseSheet = create<{
  target: BrowseSheetTarget | null;
  open: boolean;
  session: number;
  /** Runs with the new list's or team's id after Create (the opener navigates to it: the sheet is outside the navigator). */
  onCreated?: (id: Id) => void;
  show(target: BrowseSheetTarget, onCreated?: (id: Id) => void): void;
  hide(): void;
}>()((set) => ({
  target: null,
  open: false,
  session: 0,
  show: (target, onCreated) => set((s) => ({ target, onCreated, open: true, session: s.session + 1 })),
  hide: () => set({ open: false }),
}));

/** Opens the Browse sheet from a screen; after Create, goes to the new list or team. */
export function useShowBrowseSheet() {
  const navigation = useNavigation();
  const show = useBrowseSheet((s) => s.show);
  return (target: BrowseSheetTarget) =>
    show(target, (id) => (target.kind === 'team' ? navigation.navigate('Team', { teamId: id }) : navigation.navigate('Collection', { collectionId: id })));
}
