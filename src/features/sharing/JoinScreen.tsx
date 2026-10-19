import { Feather } from '@expo/vector-icons';
import { StackActions, useNavigation, type StaticScreenProps } from '@react-navigation/native';
import { useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { isApiError } from '@/core/http/problem';
import { useJoinByLink } from '@/data/tasks/mutations';
import { useLinkPreview } from '@/data/tasks/queries';
import type { LinkPreview } from '@/data/tasks/types';
import { useMe } from '@/data/tenancy/queries';
import { errorMessage } from '@/shared/i18n/errors';
import { Button, Notice, Screen, Text, TextButton, useTheme, useToast } from '@/shared/ui';

/**
 * "Join Family?" (D95, M84, the hub's A): what a link opens, on a screen of its own, from a team's invite link, an
 * invitation email's link, or a pasted one. The team's or list's initial, its name, who invited, and how big it is
 * ("4 people · 3 lists"), never who the members are. An email's invitation signed in with another address asks "Join as
 * …?". **Join** opens what was joined; already in it, **Open** does. **Not now** closes it.
 */
export function JoinScreen({ route }: StaticScreenProps<{ kind: 'team' | 'invitation'; code: string }>) {
  const { kind, code } = route.params;
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  const navigation = useNavigation();
  const me = useMe().data;
  const preview = useLinkPreview(kind, code);
  const join = useJoinByLink();
  const p = preview.data;

  useLayoutEffect(() => {
    navigation.setOptions({ headerLeft: () => <TextButton label={t('common.close')} onPress={() => navigation.goBack()} /> });
  });

  const go = (target: LinkPreview) => {
    if (target.kind === 'task' && target.taskId) navigation.dispatch(StackActions.replace('TaskDetail', { taskId: target.taskId }));
    else if (target.kind === 'team' && target.teamId) navigation.dispatch(StackActions.replace('Team', { teamId: target.teamId }));
    else if (target.taskListId) navigation.dispatch(StackActions.replace('TaskList', { taskListId: target.taskListId }));
    else navigation.goBack();
  };
  const accept = () => {
    if (!p) return;
    join.mutate({ kind, code }, {
      onSuccess: () => {
        if (p.kind !== 'task') useToast.getState().show({ message: t('join.joined', { name: p.name }) });
        go(p);
      },
    });
  };

  if (preview.isPending) return <Screen edges={['bottom']}><View style={styles.center}><ActivityIndicator color={colors.ink3} /></View></Screen>;
  if (!p) {
    const gone = isApiError(preview.error) && preview.error.status === 404;
    return (
      <Screen edges={['bottom']}>
        <View style={[styles.center, { gap: space.sm }]}>
          <Feather name="link-2" size={32} color={colors.ink3} />
          <Text variant="title" style={styles.text}>{t('join.gone')}</Text>
          <Text variant="body" color="ink2" style={styles.text}>{gone ? t('join.goneBody') : errorMessage(preview.error)}</Text>
        </View>
      </Screen>
    );
  }

  const other = kind === 'invitation' && !!p.email && !!me && p.email.toLowerCase() !== me.email.toLowerCase();
  const size = p.kind === 'team' ? t('join.teamSize', { people: t('browse.people', { count: p.people ?? 0 }), lists: t('join.lists', { count: p.lists ?? 0 }) })
    : p.kind === 'taskList' ? t('join.listSize', { people: t('browse.people', { count: p.people ?? 0 }), tasks: t('join.openTasks', { count: p.openTasks ?? 0 }) })
    : null;
  const who = p.invitedBy || t('notifications.someone');
  const title = p.member ? t('join.already', { name: p.name }) : p.kind === 'task' ? t('join.taskTitle', { name: who, title: p.name }) : t('join.title', { name: p.name });

  return (
    <Screen edges={['bottom']}>
      <View style={[styles.center, { gap: space.sm }]}>
        <View style={[styles.tile, { backgroundColor: colors.accent }]}>
          {p.kind === 'task'
            ? <Feather name="check-circle" size={30} color={colors.onAccent} />
            : <Text variant="title" style={{ color: colors.onAccent }}>{p.name.trim().charAt(0).toUpperCase()}</Text>}
        </View>
        <Text variant="title" accessibilityRole="header" style={styles.text}>{title}</Text>
        {!p.member && p.kind !== 'task' && <Text variant="body" color="ink2">{t('join.invitedBy', { name: who })}</Text>}
        {p.kind === 'task' && <Text variant="body" color="ink2" style={styles.text}>{t('join.taskBody')}</Text>}
        {size && <Text variant="footnote" color="ink3">{size}</Text>}
        {other && !p.member && (
          <View style={[styles.other, { padding: space.md, marginTop: space.md, backgroundColor: colors.warnSoft }]}>
            <Text variant="subhead" style={styles.text}>{t('join.otherEmail', { sent: p.email, me: me!.email })}</Text>
          </View>
        )}
        {join.error && <View style={{ marginTop: space.md }}><Notice>{errorMessage(join.error)}</Notice></View>}
        <View style={[styles.actions, { gap: space.sm, marginTop: space.xl }]}>
          {p.member
            ? <Button title={t('join.open')} onPress={() => go(p)} />
            : <Button title={other ? t('join.joinAs', { email: me!.email }) : p.kind === 'task' ? t('join.seeTask') : t('join.join')} onPress={accept} loading={join.isPending} />}
          {!p.member && <Button variant="link" title={t('join.notNow')} onPress={() => navigation.goBack()} disabled={join.isPending} />}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 48 },
  tile: { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  text: { textAlign: 'center' },
  other: { borderRadius: 12, alignSelf: 'stretch' },
  actions: { alignSelf: 'stretch' },
});
