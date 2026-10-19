import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Switch, View } from 'react-native';

import { formatLocalTime } from '@/core/dates/localDate';
import type { LocalTime } from '@/core/types';
import { useUpdateNotificationSettings } from '@/data/collaboration/mutations';
import { useNotificationSettings } from '@/data/collaboration/queries';
import { PUSH_GROUPS, type NotificationSettings, type PushGroup } from '@/data/collaboration/types';
import { useNotificationPermission } from '@/shared/notifications/permission';
import { pushSupported } from '@/shared/notifications/push';
import { Button, ListRow, Notice, Screen, SectionLabel, SkeletonRow, Text, TimeWheel, useTheme } from '@/shared/ui';

/**
 * Me › Notifications (D97, the hub's Push notifications, A): reminders on this phone (M42), a push switch per group and
 * quiet hours (a switch and two times, in the profile's time zone), saved for the account at once. With notifications
 * off in the phone, a note with Turn on in Settings, and the switches wait.
 */
export function NotificationsScreen() {
  const { t, i18n } = useTranslation();
  const { colors, space } = useTheme();
  const permission = useNotificationPermission((s) => s.status);
  const settings = useNotificationSettings().data;
  const update = useUpdateNotificationSettings();
  const [editing, setEditing] = useState<'quietFrom' | 'quietTo' | null>(null);
  const off = permission === 'denied';

  const toggle = (value: boolean, onChange: (v: boolean) => void, label: string, disabled = off) => (
    <Switch
      value={value && !disabled}
      onValueChange={onChange}
      disabled={disabled}
      accessibilityLabel={label}
      trackColor={{ true: colors.accent, false: colors.line }}
      thumbColor={colors.surface}
      ios_backgroundColor={colors.line}
    />
  );
  const set = (change: Partial<NotificationSettings>) => update.mutate(change);
  const timeRow = (key: 'quietFrom' | 'quietTo', value: LocalTime, last: boolean) => (
    <View key={key}>
      <ListRow label={t(`push.${key}`)} value={formatLocalTime(value, i18n.language)} onPress={() => setEditing(editing === key ? null : key)} divider={!last || editing === key} chevron={false} />
      {editing === key && (
        <TimeWheel value={value} onChange={(v) => set({ [key]: v })} locale={i18n.language} labels={{ hour: t('wheels.hour'), minute: t('wheels.minute'), period: t('wheels.period') }} />
      )}
    </View>
  );

  return (
    <Screen scroll edges={['bottom']} contentStyle={{ paddingBottom: space.huge }}>
      <View style={{ paddingBottom: space.sm }}>
        <Text variant="title" accessibilityRole="header">{t('settings.notifications')}</Text>
      </View>

      {off && (
        <View style={{ gap: space.sm, marginBottom: space.md }}>
          <Notice tone="info">{t('push.offInPhone')}</Notice>
          <Button variant="link" title={t('push.turnOnInSettings')} onPress={() => Linking.openSettings()} />
        </View>
      )}

      <ListRow
        label={t('settings.reminders')}
        detail={t('push.remindersHint')}
        accessory={permission === 'unknown' ? undefined : <Text variant="body" color="ink2">{t(permission === 'granted' ? 'settings.remindersOn' : 'settings.remindersOff')}</Text>}
        divider={false}
      />

      <SectionLabel>{t('push.title')}</SectionLabel>
      {settings ? (
        PUSH_GROUPS.map((group: PushGroup, i) => (
          <ListRow
            key={group}
            label={t(`push.groups.${group}`)}
            detail={t(`push.groupHints.${group}`)}
            accessory={toggle(settings[group], (v) => set({ [group]: v }), t(`push.groups.${group}`))}
            divider={i < PUSH_GROUPS.length - 1}
          />
        ))
      ) : (
        <SkeletonRow width={60} />
      )}
      <Text variant="footnote" color="ink3" style={{ marginTop: space.sm }}>
        {pushSupported ? t('push.everyPhone') : t('push.notInExpoGo')}
      </Text>

      <SectionLabel>{t('push.quietHours')}</SectionLabel>
      {settings && (
        <>
          <ListRow
            label={t('push.quietHours')}
            accessory={toggle(settings.quietHours, (v) => set({ quietHours: v }), t('push.quietHours'), false)}
            divider={settings.quietHours}
          />
          {settings.quietHours && [timeRow('quietFrom', settings.quietFrom, false), timeRow('quietTo', settings.quietTo, true)]}
        </>
      )}
      <Text variant="footnote" color="ink3" style={{ marginTop: space.sm }}>{t('push.quietHint')}</Text>
    </Screen>
  );
}
