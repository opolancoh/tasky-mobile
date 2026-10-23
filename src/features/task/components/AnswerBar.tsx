import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import type { UserRef } from '@/data/tasks/types';
import { Avatar } from '@/shared/components';
import { Text, useTheme } from '@/shared/ui';

/**
 * A task waiting for the caller's answer (M101): docked at the bottom of Task detail, who gave it and when it's due,
 * then Decline and Accept full width, in thumb reach. The fields above stay readable and locked until they answer.
 */
export function AnswerBar({ from, due, busy, onDecline, onAccept }: { from?: UserRef | null; due?: string; busy: boolean; onDecline(): void; onAccept(): void }) {
  const { t } = useTranslation();
  const { colors, radius, space } = useTheme();
  const name = from?.displayName || t('notifications.someone');
  const button = (label: string, primary: boolean, onPress: () => void) => (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityState={{ disabled: busy }}
      style={({ pressed }) => [
        styles.button,
        { borderRadius: radius.lg, backgroundColor: primary ? (pressed ? colors.accentPressed : colors.accent) : pressed ? colors.line : colors.surface2, opacity: busy ? 0.6 : 1 },
      ]}
    >
      <Text variant="button" style={{ color: primary ? colors.onAccent : colors.ink }}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={[styles.bar, { gap: space.sm, paddingTop: space.md, paddingBottom: space.sm, paddingHorizontal: space.lg, borderTopColor: colors.line, backgroundColor: colors.surface }]} accessibilityRole="summary">
      <View style={[styles.line, { gap: space.sm }]}>
        <Avatar name={name} seed={from?.id ?? name} size={22} />
        <Text variant="footnote" color="ink2" numberOfLines={1} style={styles.fill}>
          {due ? t('taskDetail.gaveYouDue', { name, date: due }) : t('taskDetail.gaveYou', { name })}
        </Text>
      </View>
      <View style={[styles.line, { gap: space.sm }]}>
        {button(t('assign.decline'), false, onDecline)}
        {button(t('taskDetail.accept'), true, onAccept)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { borderTopWidth: StyleSheet.hairlineWidth },
  line: { flexDirection: 'row', alignItems: 'center' },
  fill: { flex: 1 },
  button: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
});
