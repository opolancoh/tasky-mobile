import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

import type { LocalDate } from '@/core/types';
import type { Home } from '@/data/tasks/types';
import { Text, useTheme, useToast } from '@/shared/ui';

import { useHomeDismissed } from '../homeDismissedStore';
import { AskRow, FollowUpRow, HoldRow, InvitationRow } from './StreamRows';

/** A request on Home (M65): an invitation (`v-`), an assignment to answer (`a-`), a follow-up (`f-`, D71) or a hold whose Until came (`h-`, D91). */
export type Request = { key: string } & ({ kind: 'invitation'; invitation: Home['invitations'][number] } | { kind: 'ask' | 'follow' | 'hold'; task: Home['toAnswer']['items'][number] });

/** Home's requests in order (invitations, answers, follow-ups), less the ones dismissed, and how many are left in all. */
export function homeRequests(data: Home, dismissed: string[]) {
  const all: Request[] = [
    ...data.invitations.map((invitation) => ({ key: `v-${invitation.id}`, kind: 'invitation' as const, invitation })),
    ...data.toAnswer.items.map((task) => ({ key: `a-${task.id}`, kind: 'ask' as const, task })),
    ...data.followUp.items.map((task) => ({ key: `f-${task.id}`, kind: 'follow' as const, task })),
    ...(data.holds?.items ?? []).map((task) => ({ key: `h-${task.id}`, kind: 'hold' as const, task })),
  ];
  const total = data.invitations.length + (data.toAnswer.total ?? 0) + (data.followUp.total ?? 0) + (data.holds?.total ?? 0);
  const shown = all.filter((r) => !dismissed.includes(r.key));
  return { total, shown, left: total - (all.length - shown.length) };
}

/** The grey "Dismiss" behind a row as it slides left. */
function DismissAction() {
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  return (
    <View style={[styles.action, { backgroundColor: colors.surface2, paddingHorizontal: space.lg }]}>
      <Text variant="label" color="ink2">{t('home.dismiss')}</Text>
    </View>
  );
}

/**
 * A request row that swipes left to leave Home (M65): it stays pending in See all and Activity; the toast offers Undo.
 * Screen readers get the same as a custom action. Keyed by the request, so a recycled cell never shows another row open.
 */
function Swipe({ userId, request, children }: { userId: string; request: Request; children: ReactNode }) {
  const { t } = useTranslation();
  const { dismiss, restore } = useHomeDismissed.getState();
  const go = () => {
    dismiss(userId, request.key);
    useToast.getState().show({ message: t('home.dismissed'), action: { label: t('common.undo'), onPress: () => restore(userId, request.key) } });
  };
  return (
    <ReanimatedSwipeable
      renderRightActions={() => <DismissAction />}
      rightThreshold={80}
      overshootRight={false}
      onSwipeableOpen={go}
    >
      <View accessibilityActions={[{ name: 'dismiss', label: t('home.dismissAction') }]} onAccessibilityAction={(e) => e.nativeEvent.actionName === 'dismiss' && go()}>
        {children}
      </View>
    </ReanimatedSwipeable>
  );
}

/** One request on Home, its row as in See all, wrapped to swipe away. */
export function RequestRow({ userId, request, today }: { userId: string; request: Request; today: LocalDate }) {
  const { colors } = useTheme();
  return (
    <Swipe key={request.key} userId={userId} request={request}>
      <View style={{ backgroundColor: colors.bg }}>
        {request.kind === 'invitation' ? <InvitationRow invitation={request.invitation} />
          : request.kind === 'ask' ? <AskRow task={request.task} today={today} />
          : request.kind === 'hold' ? <HoldRow task={request.task} />
          : <FollowUpRow task={request.task} />}
      </View>
    </Swipe>
  );
}

const styles = StyleSheet.create({
  action: { justifyContent: 'center', alignItems: 'flex-end', minWidth: 120 },
});
