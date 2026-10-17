import { Feather } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { useColorScheme, View } from 'react-native';

import { ListRow, Screen, Text, useAppearance, useTheme, type AppearanceChoice } from '@/shared/ui';

const CHOICES: { value: AppearanceChoice; icon: ComponentProps<typeof Feather>['name'] }[] = [
  { value: 'system', icon: 'smartphone' },
  { value: 'light', icon: 'sun' },
  { value: 'dark', icon: 'moon' },
];

/**
 * Me › Appearance (M68): System, Light (default) or Dark, kept on this device. A tap applies at once and the screen
 * stays, so the change shows; no Save.
 */
export function AppearanceScreen() {
  const { t } = useTranslation();
  const { colors, space } = useTheme();
  const appearance = useAppearance((s) => s.appearance);
  const setAppearance = useAppearance((s) => s.setAppearance);
  // With System picked nothing overrides the OS, so this is the phone's own setting.
  const os = useColorScheme() === 'dark' ? 'dark' : 'light';
  return (
    <Screen scroll edges={['bottom']}>
      <View style={{ gap: space.md, paddingBottom: space.sm }}>
        <Text variant="title" accessibilityRole="header">{t('settings.appearance')}</Text>
        <Text variant="subhead" color="ink2">{t('settings.appearanceHint')}</Text>
      </View>
      {CHOICES.map(({ value, icon }, i) => (
        <ListRow
          key={value}
          label={t(`settings.appearances.${value}`)}
          icon={<Feather name={icon} size={18} color={colors.ink2} />}
          value={value === 'system' && appearance === 'system' ? t('settings.appearanceNow', { scheme: t(`settings.appearances.${os}`) }) : undefined}
          selected={appearance === value}
          onPress={() => setAppearance(value)}
          divider={i < CHOICES.length - 1}
        />
      ))}
      <Text variant="footnote" color="ink3" style={{ marginTop: space.md }}>{t('settings.thisDeviceHint')}</Text>
    </Screen>
  );
}
