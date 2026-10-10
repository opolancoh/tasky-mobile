import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { limits } from '@/core/validation/limits';
import { useUpdateMe } from '@/data/tenancy/mutations';
import { useMe } from '@/data/tenancy/queries';
import { errorMessage } from '@/shared/i18n/errors';
import { Notice, Screen, Text, TextField, useTheme, useToast } from '@/shared/ui';

import { useHeaderSave } from './useHeaderSave';

/** Settings › Name (M41): the name others see on shared lists, assignments and notifications. Save in the header. */
export function EditNameScreen() {
  const { t } = useTranslation();
  const { space } = useTheme();
  const navigation = useNavigation();
  const me = useMe().data;
  const update = useUpdateMe();
  const [name, setName] = useState(me?.displayName ?? '');
  const trimmed = name.trim();
  const save = () => update.mutate({ displayName: trimmed }, { onSuccess: () => { navigation.goBack(); useToast.getState().show({ message: t('settings.saved') }); } });
  useHeaderSave(save, !!trimmed && trimmed !== me?.displayName, update.isPending);

  return (
    <Screen scroll edges={['bottom']}>
      <View style={{ gap: space.lg }}>
        <Text variant="title" accessibilityRole="header">{t('settings.name')}</Text>
        {update.error && <Notice>{errorMessage(update.error)}</Notice>}
        <TextField label={t('settings.name')} value={name} onChangeText={setName} maxLength={limits.displayNameMax} autoFocus autoComplete="name" returnKeyType="done" onSubmitEditing={() => trimmed && trimmed !== me?.displayName && save()} hint={t('settings.nameHint')} />
      </View>
    </Screen>
  );
}
