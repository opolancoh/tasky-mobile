import { useNavigation } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { timeZones, zoneCity, zoneRegion } from '@/core/dates/timeZones';
import { useUpdateMe } from '@/data/tenancy/mutations';
import { useMe } from '@/data/tenancy/queries';
import { errorMessage } from '@/shared/i18n/errors';
import { deviceTimeZone } from '@/shared/i18n/i18n';
import { ListRow, Notice, Screen, SearchField, Text, useTheme, useToast } from '@/shared/ui';

/**
 * Settings › Time zone (M41): when "today" starts and when reminders fire. The device's zone first, then the common ones;
 * a search narrows them. A tap saves and goes back.
 */
export function TimeZoneScreen() {
  const { t } = useTranslation();
  const { space } = useTheme();
  const navigation = useNavigation();
  const me = useMe().data;
  const update = useUpdateMe();
  const [query, setQuery] = useState('');
  const device = deviceTimeZone();
  const q = query.trim().toLowerCase();
  const zones = [device, ...timeZones.filter((z) => z !== device)].filter((z) => !q || z.toLowerCase().replace(/_/g, ' ').includes(q));

  const pick = (zone: string) => {
    if (zone === me?.timeZone) return navigation.goBack();
    update.mutate({ timeZone: zone }, { onSuccess: () => { navigation.goBack(); useToast.getState().show({ message: t('settings.timeZoneSaved', { zone: zoneCity(zone) }) }); } });
  };

  return (
    <Screen edges={['bottom']} contentStyle={{ flex: 1 }}>
      <FlashList
        data={zones}
        keyExtractor={(z) => z}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={{ gap: space.md, paddingBottom: space.sm }}>
            <Text variant="title" accessibilityRole="header">{t('settings.timeZone')}</Text>
            <Text variant="subhead" color="ink2">{t('settings.timeZoneHint')}</Text>
            <SearchField value={query} onChangeText={setQuery} placeholder={t('settings.searchZone')} clearLabel={t('search.clearField')} />
            {update.error && <Notice>{errorMessage(update.error)}</Notice>}
          </View>
        }
        renderItem={({ item }) => (
          <ListRow
            label={zoneCity(item)}
            detail={item === device ? t('settings.thisDevice', { region: zoneRegion(item) || item }) : zoneRegion(item) || undefined}
            selected={item === me?.timeZone}
            onPress={() => pick(item)}
          />
        )}
      />
    </Screen>
  );
}
