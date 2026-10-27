import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Skeleton, SkeletonSection, useTheme } from '@/shared/ui';

import { FieldRowSkeleton } from './FieldRow';

/**
 * Task detail while it loads (M108): the top as laid out (title, list line, the field groups), then two generic sections.
 * Kept rough on purpose, so small changes to the screen don't need it changed.
 */
export function TaskDetailSkeleton() {
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  return (
    <View accessibilityLabel={t('taskDetail.loading')} accessibilityRole="progressbar">
      <View style={[styles.head, { gap: space.md, paddingTop: space.sm }]}>
        <Skeleton width={28} height={28} radius={14} style={styles.check} />
        <View style={styles.title}><Skeleton width="80%" height={20} /></View>
      </View>
      <View style={styles.where}><Skeleton width="40%" height={12} /></View>

      <View style={{ marginTop: space.md }}>
        {[['50%'], ['45%', '55%', '35%'], ['40%']].map((group) => (
          <View key={group.join()} style={[styles.group, { borderTopColor: colors.line }]}>
            {group.map((w) => <FieldRowSkeleton key={w} width={w as `${number}%`} />)}
          </View>
        ))}
      </View>

      <View style={{ marginTop: space.xxl, gap: space.xxl }}>
        <SkeletonSection lines={3} />
        <SkeletonSection box={96} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'flex-start' },
  check: { marginTop: 4 },
  title: { flex: 1, paddingTop: 8 },
  where: { marginLeft: 40, marginTop: 6, minHeight: 18 },
  group: { borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 4 },
});
