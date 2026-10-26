import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Skeleton, useTheme } from '@/shared/ui';

/**
 * Task detail while the task loads (M108): all skeleton, in the screen's layout from top to bottom (M98, M106): title,
 * list line, fields, steps, notes, comments (`comments`, with `CommentFieldSkeleton` docked), the closing lines.
 */
export function TaskDetailSkeleton({ comments }: { comments: boolean }) {
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  const field = (width: `${number}%`, round = false) => (
    <View style={[styles.field, { gap: space.md, paddingVertical: space.xs }]}>
      <View style={styles.icon}><Skeleton width={22} height={22} radius={round ? 11 : 7} /></View>
      <Skeleton width={width} height={15} />
    </View>
  );

  return (
    <View accessibilityLabel={t('taskDetail.loading')} accessibilityRole="progressbar">
      <View style={[styles.head, { gap: space.md, paddingTop: space.sm }]}>
        <Skeleton width={28} height={28} radius={14} style={styles.checkSpot} />
        <View style={[styles.title, { paddingTop: 8 }]}><Skeleton width="80%" height={20} /></View>
        <View style={styles.flag}><Skeleton width={20} height={20} radius={5} /></View>
      </View>
      <View style={[styles.where, styles.whereBar]}><Skeleton width="40%" height={12} /></View>

      <View style={{ marginTop: space.md }}>
        <View style={[styles.group, { borderTopColor: colors.line }]}>{field('50%', true)}</View>
        <View style={[styles.group, { borderTopColor: colors.line }]}>
          {field('45%')}
          {field('55%')}
          {field('35%')}
        </View>
        <View style={[styles.group, { borderTopColor: colors.line }]}>{field('40%')}</View>
      </View>

      <View style={{ marginTop: space.xxl }}>
        <View style={{ marginBottom: space.xs, gap: space.sm }}>
          <View style={styles.between}>
            <Skeleton width="20%" height={12} />
            <Skeleton width="12%" height={12} />
          </View>
          <Skeleton width="100%" height={4} radius={2} />
        </View>
        {(['70%', '55%'] as const).map((w) => (
          <View key={w} style={[styles.step, { gap: space.md }]}>
            <Skeleton width={19} height={19} radius={10} />
            <Skeleton width={w} height={14} />
          </View>
        ))}
        <View style={[styles.step, { gap: space.md }]}>
          <Skeleton width={19} height={19} radius={5} />
          <Skeleton width="30%" height={14} />
        </View>
      </View>

      <View style={{ marginTop: space.xxl, gap: space.sm }}>
        <Skeleton width="18%" height={12} />
        <Skeleton width="100%" height={96} radius={12} />
      </View>

      {comments && (
        <View style={{ marginTop: space.xxl, gap: space.xs }}>
          <Skeleton width="24%" height={12} />
          {(['75%', '50%'] as const).map((w) => (
            <View key={w} style={[styles.comment, { gap: space.md, paddingVertical: space.sm }]}>
              <Skeleton width={28} height={28} radius={14} />
              <View style={[styles.fill, { gap: space.sm, paddingTop: 2 }]}>
                <Skeleton width="30%" height={13} />
                <Skeleton width={w} height={13} />
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={{ marginTop: space.xxl, gap: space.sm }}>
        <Skeleton width="65%" height={11} />
        <Skeleton width="55%" height={11} />
      </View>
      {comments && <View style={{ marginTop: space.lg }}><Skeleton width="28%" height={13} /></View>}
    </View>
  );
}

/** Where `CommentField` docks (M82), while the task loads. */
export function CommentFieldSkeleton() {
  const { colors, radius, space } = useTheme();
  return (
    <View style={[styles.band, { paddingVertical: space.sm, paddingHorizontal: space.lg, borderTopColor: colors.line, backgroundColor: colors.bg }]}>
      <Skeleton width="100%" height={44} radius={radius.pill} />
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'flex-start' },
  checkSpot: { marginTop: 4 },
  title: { flex: 1, fontSize: 22, paddingTop: 2 },
  flag: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginTop: -6, marginRight: -12 },
  where: { flexDirection: 'row', alignItems: 'center', marginLeft: 40, marginTop: 2 },
  whereBar: { minHeight: 18 },
  group: { borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 4 },
  field: { flexDirection: 'row', alignItems: 'center', minHeight: 50 },
  icon: { width: 24, alignItems: 'center' },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  step: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  comment: { flexDirection: 'row', alignItems: 'flex-start' },
  fill: { flex: 1 },
  band: { borderTopWidth: StyleSheet.hairlineWidth },
});
