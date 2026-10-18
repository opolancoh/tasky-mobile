import { useNavigation, type StaticScreenProps } from '@react-navigation/native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { todayIn } from '@/core/dates/localDate';
import type { Id, LocalDate } from '@/core/types';
import { useHoldTask, useResumeTask } from '@/data/tasks/mutations';
import { useMembers, useTask } from '@/data/tasks/queries';
import { useMe } from '@/data/tenancy/queries';
import { DueDatePicker } from '@/shared/components';
import { HOLD_REASONS } from '@/shared/hold/useHoldActions';
import { useDateLabels } from '@/shared/hooks/useDateLabels';
import { useHeaderSave } from '@/shared/hooks/useHeaderSave';
import { errorMessage } from '@/shared/i18n/errors';
import { chooseAction, ListRow, Notice, Pill, Screen, SectionLabel, SkeletonRow, Text, TextField, useTheme, useToast } from '@/shared/ui';

/** Longest reason (the API's `HoldReasonMax`, D91). */
const REASON_MAX = 200;

/**
 * Put on hold, the long way (D91, M80): from a row's Other reason… or Until or who resumes it…, and Edit the reason. A
 * reason (required, with the quick ones as chips), **Until** (optional: that day it shows in Home's Requests, it doesn't
 * resume by itself) and **Can resume it** (optional: someone who sees the list, who is told). Save in the header.
 * `mode: 'resume'`: Resume with a new due date, when the old one passed while it waited.
 */
export function HoldScreen({ route }: StaticScreenProps<{ taskId: Id; mode: 'hold' | 'resume' }>) {
  const { taskId, mode } = route.params;
  const { t } = useTranslation();
  const { space } = useTheme();
  const navigation = useNavigation();
  const me = useMe().data;
  const today = me ? todayIn(me.timeZone) : undefined;
  const labels = useDateLabels(today);
  const task = useTask(taskId).data;
  const members = useMembers({ kind: 'taskList', id: task?.taskList?.id ?? '' }, mode === 'hold' && !!task?.taskList);
  const hold = useHoldTask();
  const resume = useResumeTask();
  const [reason, setReason] = useState<string | null>(null);
  const [until, setUntil] = useState<LocalDate | null | undefined>(undefined);
  const [resumerId, setResumerId] = useState<Id | null | undefined>(undefined);
  const [picking, setPicking] = useState(false);
  // The draft starts from the task (Edit the reason) until the user changes something.
  const text = reason ?? task?.holdReason ?? '';
  const untilDate = until === undefined ? (task?.holdUntil ?? null) : until;
  const resumer = resumerId === undefined ? (task?.resumer?.id ?? null) : resumerId;
  const resumerName = members.data?.find((m) => m.userId === resumer)?.displayName ?? task?.resumer?.displayName;
  const done = (message: string) => { navigation.goBack(); useToast.getState().show({ message }); };

  const save = () => task && hold.mutate({ task, reason: text.trim(), until: untilDate, resumerId: resumer }, { onSuccess: () => done(t(task.status === 'onHold' ? 'hold.saved' : 'hold.held', { title: task.title })) });
  useHeaderSave(save, mode === 'hold' && !!task && !!text.trim(), hold.isPending);

  const pickResumer = async () => {
    const people = members.data ?? [];
    const i = await chooseAction({
      title: t('hold.resumer'),
      actions: [{ label: t('hold.anyone'), selected: !resumer }, ...people.map((m) => ({ label: m.userId === me?.id ? t('assign.me', { name: m.displayName }) : m.displayName, selected: m.userId === resumer }))],
      cancelLabel: t('common.cancel'),
    });
    if (i !== null) setResumerId(i === 0 ? null : people[i - 1].userId);
  };

  if (!task || !today) return <Screen edges={['bottom']}><SkeletonRow width={60} /></Screen>;

  if (mode === 'resume') {
    return (
      <Screen edges={['bottom']}>
        <View style={{ gap: space.xs, paddingBottom: space.md }}>
          <Text variant="label" color="ink3">{task.title}</Text>
          <Text variant="title" accessibilityRole="header">{t('hold.newDate')}</Text>
        </View>
        {resume.error && <Notice>{errorMessage(resume.error)}</Notice>}
        <DueDatePicker value={task.dueDate ?? undefined} today={today} onChange={() => undefined}
          onPick={(date) => resume.mutate({ task, dueDate: date }, { onSuccess: () => done(t('hold.resumed', { title: task.title })) })} />
      </Screen>
    );
  }

  return (
    <Screen scroll edges={['bottom']}>
      <View style={{ gap: space.lg }}>
        <View style={{ gap: space.xs }}>
          <Text variant="label" color="ink3">{task.title}</Text>
          <Text variant="title" accessibilityRole="header">{t(task.status === 'onHold' ? 'hold.edit' : 'hold.put')}</Text>
        </View>
        {hold.error && <Notice>{errorMessage(hold.error)}</Notice>}
        <View style={{ gap: space.sm }}>
          <TextField label={t('hold.why')} value={text} onChangeText={setReason} maxLength={REASON_MAX} autoFocus={!task.holdReason} placeholder={t('hold.whyHint')} returnKeyType="done" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {HOLD_REASONS.map((r) => <Pill key={r} label={t(`hold.reason.${r}`)} tone={text === t(`hold.reason.${r}`) ? 'accent' : 'quiet'} onPress={() => setReason(t(`hold.reason.${r}`))} />)}
          </View>
        </View>
        <View>
          <SectionLabel>{t('hold.options')}</SectionLabel>
          <ListRow label={t('hold.until')} value={untilDate ? labels.day(untilDate) : t('hold.none')} onPress={() => setPicking((p) => !p)} />
          {picking && <DueDatePicker value={untilDate ?? undefined} today={today} onChange={setUntil} onPick={(date) => { setUntil(date ?? null); setPicking(false); }} />}
          <ListRow label={t('hold.resumer')} value={resumer ? resumerName : t('hold.anyone')} onPress={pickResumer} divider={false} />
          <Text variant="footnote" color="ink3" style={{ marginTop: space.sm }}>{t('hold.optionsHint')}</Text>
        </View>
      </View>
    </Screen>
  );
}
