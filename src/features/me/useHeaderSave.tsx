import { useNavigation } from '@react-navigation/native';
import { useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { Text, useTheme } from '@/shared/ui';

/** Save in the header of a settings page (M26's place for the screen's one action): enabled when `enabled`, a spinner while saving. */
export function useHeaderSave(onSave: () => void, enabled: boolean, busy: boolean) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        busy ? <ActivityIndicator color={colors.ink3} style={styles.button} /> : (
          <Pressable onPress={onSave} disabled={!enabled} hitSlop={8} accessibilityRole="button" accessibilityState={{ disabled: !enabled }} style={styles.button}>
            <Text variant="button" color={enabled ? 'accent' : 'ink3'}>{t('common.save')}</Text>
          </Pressable>
        ),
    });
  });
}

const styles = StyleSheet.create({ button: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'flex-end' } });
