import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { LocalDate } from '@/core/types';
import type { TaskPreview } from '@/data/tasks/types';
import { useDateLabels } from '@/shared/hooks/useDateLabels';
import { ColorDot, Skeleton, Text, useTheme } from '@/shared/ui';

import { FieldRow } from './FieldRow';

/**
 * Task detail while the task loads (M108): what the tapped row had (title, flag, list, due date) at once, the rest as
 * skeleton in the screen's layout (M98, M106). Opened without a row (a link, a push), all of it is skeleton.
 */
export function TaskDetailSkeleton({ preview, today }: { preview?: TaskPreview; today?: LocalDate }) {
  const { t } = useTranslation();
  const { colors, space, type } = useTheme();
  const labels = useDateLabels(today);
  const row = (width: `${number}%`) => (
    <View style={[styles.row, { gap: space.md }]}>
      <Skeleton width={22} height={22} radius={7} />
      <Skeleton width={width} height={15} />
    </View>
  );
  const overdue = !!preview?.dueDate && !!today && preview.dueDate < today && preview.status === 'open';

  return (
    <View accessibilityLabel={t('taskDetail.loading')} accessibilityRole="progressbar">
      {preview ? (
        <>
          <View style={[styles.head, { gap: space.md, paddingTop: space.sm }]}>
            <View style={[styles.check, { borderColor: colors.ink3 }]} />
            <Text style={[styles.title, { fontFamily: type.title.fontFamily, letterSpacing: type.title.letterSpacing, color: colors.heading }]} numberOfLines={3}>{preview.title}</Text>
            <View style={styles.flag}>
              <Feather name="flag" size={22} color={preview.isImportant ? colors.danger : colors.ink3} />
            </View>
          </View>
          {preview.taskList && (
            <View style={[styles.where, { gap: space.xs }]}>
              {preview.taskList.isInbox ? <Feather name="inbox" size={14} color={colors.ink3} /> : <ColorDot color={preview.taskList.color} size={9} />}
              <Text variant="footnote" color="ink2" numberOfLines={1}>{preview.taskList.isInbox ? t('browse.inbox') : preview.taskList.name}</Text>
            </View>
          )}
        </>
      ) : (
        <View style={[styles.head, { gap: space.md, paddingTop: space.sm }]}>
          <Skeleton width={28} height={28} radius={14} />
          <View style={[styles.title, { gap: space.sm, paddingTop: 4 }]}>
            <Skeleton width="80%" height={20} />
            <Skeleton width="40%" height={12} />
          </View>
        </View>
      )}

      <View style={{ marginTop: space.md }}>
        <View style={[styles.group, { borderTopColor: colors.line }]}>{row('55%')}</View>
        <View style={[styles.group, { borderTopColor: colors.line }]}>
          {preview?.dueDate ? (
            <FieldRow
              icon={(color) => <Feather name="calendar" size={20} color={color} />}
              placeholder=""
              value={overdue
                ? <Text variant="body" color="danger">{t('taskDetail.overdue', { date: labels.day(preview.dueDate) })}</Text>
                : t('taskDetail.dueOn', { date: labels.day(preview.dueDate) })}
            />
          ) : row('45%')}
          {row('60%')}
          {row('35%')}
        </View>
        <View style={[styles.group, { borderTopColor: colors.line }]}>{row('50%')}</View>
      </View>

      <View style={{ marginTop: space.xxl, gap: space.sm }}>
        <Skeleton width="22%" height={12} />
        <Skeleton width="100%" height={4} radius={2} />
        {(['70%', '55%'] as const).map((w) => (
          <View key={w} style={[styles.step, { gap: space.md }]}>
            <Skeleton width={19} height={19} radius={10} />
            <Skeleton width={w} height={14} />
          </View>
        ))}
      </View>

      <View style={{ marginTop: space.xxl, gap: space.sm }}>
        <Skeleton width="18%" height={12} />
        <Skeleton width="100%" height={96} radius={12} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'flex-start' },
  /** Where the circle will be: the task can't be completed until it's loaded. */
  check: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.6, marginTop: 4 },
  title: { flex: 1, fontSize: 22, paddingTop: 2 },
  flag: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginTop: -6, marginRight: -12 },
  where: { flexDirection: 'row', alignItems: 'center', marginLeft: 40, marginTop: 2 },
  group: { borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 50 },
  step: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
});
