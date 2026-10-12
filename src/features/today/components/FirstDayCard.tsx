import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import type { TenantType } from '@/data/tenancy/types';
import { useQuickAdd } from '@/shared/quickAdd/quickAddStore';
import { radius, Text, useTheme } from '@/shared/ui';

import { STARTERS } from '../starters';

/**
 * Today on a new user's first day (M51): nothing open anywhere and nothing to answer. A tinted card with starter ideas
 * for the kind of account (starters.ts); a starter opens Quick add with its title, Add a task opens it empty.
 */
export function FirstDayCard({ tenantType, companyName }: { tenantType: TenantType; companyName: string | null }) {
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  const show = useQuickAdd((s) => s.show);
  const company = tenantType === 'organization';

  return (
    <View style={[styles.card, { backgroundColor: colors.accentSoft, padding: space.lg, marginTop: space.xs }]}>
      <View style={[styles.icon, { backgroundColor: colors.surface }]}>
        <Feather name={company ? 'briefcase' : 'star'} size={20} color={colors.accent} />
      </View>
      <Text variant="headline" color="heading" style={[styles.title, { marginTop: space.md }]} accessibilityRole="header">
        {company && companyName ? t('today.firstDay.welcome', { name: companyName }) : t('today.firstDay.title')}
      </Text>
      <Text variant="subhead" color="ink2" style={{ marginTop: space.xxs, marginBottom: space.md }}>
        {t(company ? 'today.firstDay.bodyCompany' : 'today.firstDay.body')}
      </Text>
      <View style={[styles.chips, { gap: space.sm }]}>
        {STARTERS[tenantType].map((starter) => {
          const title = t(`today.starters.${starter.id}`);
          return (
            <Pressable
              key={starter.id}
              onPress={() => show(title)}
              accessibilityRole="button"
              accessibilityHint={t('today.firstDay.starterHint')}
              style={({ pressed }) => [styles.chip, { backgroundColor: colors.surface, paddingHorizontal: space.md, gap: space.xs, opacity: pressed ? 0.6 : 1 }]}
            >
              <Feather name={starter.icon} size={14} color={colors[starter.tone]} />
              <Text variant="subhead">{title}</Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable
        onPress={() => show()}
        accessibilityRole="button"
        style={({ pressed }) => [styles.add, { backgroundColor: pressed ? colors.accentPressed : colors.accent, gap: space.xs, marginTop: space.lg }]}
      >
        <Feather name="plus" size={18} color={colors.onAccent} />
        <Text variant="button" color="onAccent">{t('today.firstDay.add')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24 },
  title: { fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  icon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { flexDirection: 'row', alignItems: 'center', minHeight: 40, borderRadius: radius.pill },
  add: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 48, borderRadius: radius.pill },
});
