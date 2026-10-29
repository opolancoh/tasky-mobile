import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { nowIn } from '@/core/dates/localDate';
import { quickReminders, sameReminder, type ReminderAt } from '@/core/dates/reminders';
import { newTaskId, useCreateTask, useDeleteTask, useReminderActions } from '@/data/tasks/mutations';
import { useTask } from '@/data/tasks/queries';
import { taskLimits, type Repeat, type RepeatPattern, type Task } from '@/data/tasks/types';
import { useMe } from '@/data/tenancy/queries';
import { ReminderIcon, ReminderPicker, RepeatPicker } from '@/shared/components';
import { useDateLabels } from '@/shared/hooks/useDateLabels';
import { useRepeatText } from '@/shared/hooks/useRepeatText';
import { useReminderSheet } from '@/shared/quickAdd/reminderSheetStore';
import { ClearButton, confirm, ListRow, Sheet, SkeletonRow, Text, useTheme, type SheetProps } from '@/shared/ui';

import { NotesPage } from './NotesPage';

type Page = 'form' | 'when' | 'repeat' | 'notes';

interface Draft {
  title: string;
  notes: string;
  at: ReminderAt | null;
  repeat: Repeat | null;
}

const plain = (pattern: RepeatPattern): Repeat => ({ pattern, interval: 1, mode: 'fromDueDate' });

/**
 * The Reminder sheet (06-mobile.md, M114, D110): "remind me to X at Y". A title, chips for the time (In 1 hour, This
 * evening, Tomorrow), Remind me (the custom date and time, M112's docked Set), Repeat (on the reminder's day) and Notes;
 * nothing else. From the +'s Reminder it adds one, shown at once (M100); from a reminder's row it edits it, with Make it a
 * task and Delete.
 */
export function ReminderSheet() {
  const session = useReminderSheet((s) => s.session);
  const taskId = useReminderSheet((s) => s.taskId);
  return taskId ? <EditReminder key={session} taskId={taskId} /> : <ReminderForm key={session} />;
}

function EditReminder({ taskId }: { taskId: string }) {
  const { t } = useTranslation();
  const open = useReminderSheet((s) => s.open);
  const hide = useReminderSheet((s) => s.hide);
  const task = useTask(taskId);
  if (task.data) return <ReminderForm task={task.data} />;
  return (
    <Sheet visible={open} size="fit" onDismiss={hide} dismissLabel={t('quickAdd.close')} title={t('reminders.edit')} left={{ label: t('quickAdd.cancel'), onPress: hide }}>
      <View>{[70, 55].map((w) => <SkeletonRow key={w} width={w} />)}</View>
    </Sheet>
  );
}

function ReminderForm({ task }: { task?: Task }) {
  const { t } = useTranslation();
  const { colors, radius, space, type } = useTheme();
  const open = useReminderSheet((s) => s.open);
  const hide = useReminderSheet((s) => s.hide);
  const me = useMe().data;
  const create = useCreateTask();
  const actions = useReminderActions();
  const remove = useDeleteTask();
  const { describe } = useRepeatText();

  const [now, setNow] = useState(() => (me ? nowIn(me.timeZone) : null));
  if (!now && me) setNow(nowIn(me.timeZone));
  const start: Draft = {
    title: task?.title ?? '',
    notes: task?.notes ?? '',
    at: task?.reminder ? { date: task.reminder.date, time: task.reminder.time.slice(0, 5) } : null,
    repeat: task?.repeat ?? null,
  };
  const [draft, setDraft] = useState<Draft>(start);
  const [page, setPage] = useState<Page>('form');
  const [beforePage, setBeforePage] = useState<Draft>(draft);
  const update = (changes: Partial<Draft>) => setDraft((d) => ({ ...d, ...changes }));
  const labels = useDateLabels(now?.date);

  const title = draft.title.trim();
  const canSave = title.length > 0 && !!draft.at;
  const when = (at: ReminderAt) => `${labels.day(at.date)}, ${labels.time(at.time)}`;
  const repeatDay = draft.at?.date ?? now?.date;

  function submit() {
    if (!canSave || !draft.at) return;
    const repeat = draft.repeat ? { pattern: draft.repeat.pattern, interval: draft.repeat.interval, daysOfWeek: draft.repeat.daysOfWeek ?? undefined, dayOfMonth: draft.repeat.dayOfMonth ?? undefined, mode: draft.repeat.mode } : undefined;
    if (!task) {
      create.mutate({ id: newTaskId(), body: { kind: 'reminder', title, notes: draft.notes.trim() || undefined, reminderDate: draft.at.date, reminderTime: draft.at.time, repeat } });
    } else {
      const moved = !sameReminder(draft.at, start.at);
      actions.save.mutate({
        task,
        body: {
          ...(title !== task.title ? { title } : {}),
          ...(draft.notes.trim() !== (task.notes ?? '') ? { notes: draft.notes.trim() || null } : {}),
          ...(moved ? { reminder: { date: draft.at.date, time: draft.at.time } } : {}),
          ...(draft.repeat !== start.repeat ? { repeat: repeat ?? null } : {}),
        },
      });
    }
    hide();
  }

  const makeTask = () => {
    if (!task) return;
    actions.makeTask.mutate(task);
    hide();
  };
  const del = async () => {
    if (!task) return;
    const yes = await confirm({ title: t('reminders.deleteTitle'), message: t('reminders.deleteBody'), confirmLabel: t('common.delete'), cancelLabel: t('common.cancel') });
    if (!yes) return;
    remove.mutate(task);
    hide();
  };

  const openPage = (next: Exclude<Page, 'form'>) => {
    Keyboard.dismiss();
    setBeforePage(draft);
    setPage(next);
  };
  const pick = (changes: Partial<Draft>) => {
    update(changes);
    setPage('form');
  };
  const titles: Record<Exclude<Page, 'form'>, string> = { when: t('reminders.remindMe'), repeat: t('taskDetail.fields.repeat'), notes: t('quickAdd.fields.notes') };
  const header: Pick<SheetProps, 'title' | 'left' | 'right'> =
    page === 'form'
      ? { title: t(task ? 'reminders.edit' : 'reminders.new'), left: { label: t('quickAdd.cancel'), onPress: hide }, right: { label: t(task ? 'common.save' : 'quickAdd.submit'), emphasis: true, disabled: !canSave, onPress: submit } }
      : { title: titles[page], left: { icon: 'chevron-left', label: t('reminders.reminder'), onPress: () => setPage('form') } };

  return (
    <Sheet visible={open} size={page === 'form' ? 'fit' : 'large'} onDismiss={page === 'form' ? hide : () => setPage('form')} onBackdropPress={page === 'form' ? hide : () => { setDraft(beforePage); setPage('form'); }} dismissLabel={t('quickAdd.close')} {...header}>
      {page === 'form' && (
        <ScrollView keyboardShouldPersistTaps="handled" bounces={false} style={styles.shrink}>
          <View style={styles.titleRow}>
            <TextInput
              autoFocus={!task}
              value={draft.title}
              onChangeText={(text) => update({ title: text })}
              placeholder={t('reminders.placeholder')}
              placeholderTextColor={colors.ink3}
              selectionColor={colors.accent}
              accessibilityLabel={t('quickAdd.fields.title')}
              multiline
              submitBehavior="blurAndSubmit"
              onSubmitEditing={submit}
              maxLength={taskLimits.titleMax}
              returnKeyType="done"
              style={[styles.title, { fontFamily: type.headline.fontFamily, fontSize: type.headline.fontSize, color: colors.heading }]}
            />
            {draft.title.length > 0 && <ClearButton size={20} onPress={() => update({ title: '' })} accessibilityLabel={t('quickAdd.clearTitle')} style={styles.clear} />}
          </View>
          {now && (
            <View style={[styles.chips, { gap: space.sm, paddingBottom: space.md }]}>
              {quickReminders(now).map(({ id, at }) => {
                const on = sameReminder(at, draft.at);
                return (
                  <Pressable
                    key={id}
                    onPress={() => update({ at })}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    style={[styles.chip, { borderRadius: radius.md, paddingHorizontal: space.md, backgroundColor: on ? colors.accentSoft : colors.surface2 }]}
                  >
                    <Text variant="subhead" style={{ fontWeight: '600', color: on ? colors.accent : colors.ink }}>{t(`reminders.${id}`)}</Text>
                    <Text variant="caption" color={on ? 'accent' : 'ink3'}>{labels.time(at.time)}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
          <View style={[styles.divider, { backgroundColor: colors.line }]} />
          <ListRow
            label={t('reminders.remindMe')}
            icon={<ReminderIcon color={draft.at ? colors.accent : colors.ink3} />}
            value={<Text variant="bodyMedium" color={draft.at ? 'accent' : 'ink3'}>{draft.at ? when(draft.at) : t('reminders.pickTime')}</Text>}
            onPress={() => openPage('when')}
          />
          <ListRow
            label={t('taskDetail.fields.repeat')}
            icon={<Feather name="repeat" size={20} color={draft.repeat ? colors.accent : colors.ink3} />}
            value={<Text variant="bodyMedium" color={draft.repeat ? 'accent' : 'ink3'} numberOfLines={1}>{draft.repeat ? describe(draft.repeat, repeatDay) : t('repeat.never')}</Text>}
            onPress={() => openPage('repeat')}
          />
          <ListRow
            label={t('quickAdd.fields.notes')}
            icon={<Feather name="align-left" size={20} color={draft.notes.trim() ? colors.accent : colors.ink3} />}
            value={<Text variant="bodyMedium" color={draft.notes.trim() ? 'ink' : 'ink3'} numberOfLines={1}>{draft.notes.trim() || t('reminders.none')}</Text>}
            onPress={() => openPage('notes')}
            divider={!!task}
          />
          {task && <ListRow label={t('reminders.makeTask')} icon={<Feather name="check-circle" size={20} color={colors.accent} />} onPress={makeTask} />}
          {task && <ListRow label={t('reminders.delete')} icon={<Feather name="trash-2" size={20} color={colors.danger} />} onPress={() => void del()} divider={false} />}
          <Text variant="footnote" color="ink3" style={{ paddingVertical: space.md }}>{t('reminders.onlyMine')}</Text>
        </ScrollView>
      )}

      {page === 'when' && now && (
        <ReminderPicker value={draft.at} onChange={(at) => update({ at })} onPick={(at) => pick({ at })} onSet={(at) => pick({ at })} now={now} />
      )}

      {page === 'repeat' && repeatDay && (
        <RepeatPicker value={draft.repeat} due={repeatDay} hint={t('reminders.repeatHint')} onPick={(pattern) => pick({ repeat: pattern ? plain(pattern) : null })} />
      )}

      {page === 'notes' && <NotesPage value={draft.notes} onChange={(notes) => update({ notes })} />}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  shrink: { flexShrink: 1 },
  // Font and size only on inputs: a lineHeight on an iOS TextInput clips descenders.
  title: { flex: 1, paddingTop: 8, paddingBottom: 12, paddingHorizontal: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  clear: { marginVertical: 0 },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { paddingVertical: 7, gap: 1 },
  divider: { height: StyleSheet.hairlineWidth },
});
