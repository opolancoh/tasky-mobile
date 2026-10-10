import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useUpdateMe } from '@/data/tenancy/mutations';
import { useMe } from '@/data/tenancy/queries';
import { errorMessage } from '@/shared/i18n/errors';
import i18n, { languages } from '@/shared/i18n/i18n';
import { ListRow, Notice, Screen, Text, useTheme } from '@/shared/ui';

/** Settings › Language (M41): the app's and everything Tasky sends (emails, notifications). A tap saves and goes back. */
export function LanguageScreen() {
  const { t } = useTranslation();
  const { space } = useTheme();
  const navigation = useNavigation();
  const me = useMe().data;
  const update = useUpdateMe();
  const pick = (language: string) => {
    if (language === me?.language) return navigation.goBack();
    update.mutate({ language }, { onSuccess: async () => { await i18n.changeLanguage(language); navigation.goBack(); } });
  };
  return (
    <Screen scroll edges={['bottom']}>
      <View style={{ gap: space.md, paddingBottom: space.sm }}>
        <Text variant="title" accessibilityRole="header">{t('settings.language')}</Text>
        <Text variant="subhead" color="ink2">{t('settings.languageHint')}</Text>
        {update.error && <Notice>{errorMessage(update.error)}</Notice>}
      </View>
      {languages.map((l, i) => (
        <ListRow key={l} label={t(`me.languages.${l}`)} selected={l === me?.language} onPress={() => pick(l)} divider={i < languages.length - 1} />
      ))}
    </Screen>
  );
}
