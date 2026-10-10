import { useNavigation } from '@react-navigation/native';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { isApiError } from '@/core/http/problem';
import { limits } from '@/core/validation/limits';
import { isPassword } from '@/core/validation/rules';
import { errorMessage } from '@/shared/i18n/errors';
import { useSession } from '@/shared/session/SessionProvider';
import { Notice, RuleCheck, Screen, Text, TextField, useTheme, useToast } from '@/shared/ui';

import { useHeaderSave } from './useHeaderSave';

/**
 * Settings › Change password (M41): the current one, then the new one with its rule checked as you type. Save in the
 * header. This device stays signed in; the others are signed out.
 */
export function ChangePasswordScreen() {
  const { t } = useTranslation();
  const { space } = useTheme();
  const navigation = useNavigation();
  const { changePassword } = useSession();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const change = useMutation({ mutationFn: () => changePassword({ currentPassword: current, newPassword: next }) });
  // Field errors of the 400: the current password is wrong, or the new one is the same.
  const wrong = isApiError(change.error) && !!change.error.errors.currentPassword;
  const same = isApiError(change.error) && !!change.error.errors.newPassword;
  const valid = current.length > 0 && isPassword(next);
  const save = () => change.mutate(undefined, { onSuccess: () => { navigation.goBack(); useToast.getState().show({ message: t('settings.passwordChanged') }); } });
  useHeaderSave(save, valid, change.isPending);

  return (
    <Screen scroll edges={['bottom']}>
      <View style={{ gap: space.xl }}>
        <View style={{ gap: space.xxs }}>
          <Text variant="title" accessibilityRole="header">{t('settings.changePassword')}</Text>
          <Text variant="subhead" color="ink2">{t('settings.changePasswordHint')}</Text>
        </View>
        {change.error && !wrong && !same && <Notice>{errorMessage(change.error)}</Notice>}
        <TextField
          label={t('settings.currentPassword')}
          value={current}
          onChangeText={setCurrent}
          autoComplete="current-password"
          textContentType="password"
          maxLength={limits.passwordMax}
          error={wrong ? t('settings.wrongPassword') : undefined}
          secureToggle={{ show: t('common.show'), hide: t('common.hide') }}
        />
        <TextField
          label={t('settings.newPassword')}
          value={next}
          onChangeText={setNext}
          autoComplete="new-password"
          textContentType="newPassword"
          maxLength={limits.passwordMax}
          error={same ? t('settings.samePassword') : undefined}
          footer={same ? undefined : <RuleCheck met={isPassword(next)} label={t('auth.signUp.passwordHint')} />}
          secureToggle={{ show: t('common.show'), hide: t('common.hide') }}
        />
      </View>
    </Screen>
  );
}
