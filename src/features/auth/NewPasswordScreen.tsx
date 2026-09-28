import { useNavigation } from '@react-navigation/native';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { isApiError } from '@/core/http/problem';
import { limits } from '@/core/validation/limits';
import { isPassword } from '@/core/validation/rules';
import { identityApi } from '@/data/identity/api';
import { IdentityErrorCodes } from '@/data/identity/types';
import { errorMessage, fieldErrors } from '@/shared/i18n/errors';
import { useSession } from '@/shared/session/SessionProvider';
import { Button, Notice, RuleCheck, Screen, Text, TextField, useTheme } from '@/shared/ui';

import { resetDraft } from './resetDraft';

/**
 * POST /auth/reset-password (every session ends), then sign in here with the new password.
 * HIG: the rule checks as you type and the button waits for a valid password.
 */
export function NewPasswordScreen() {
  const { t } = useTranslation();
  const { space } = useTheme();
  const navigation = useNavigation();
  const { signIn } = useSession();
  const draft = resetDraft.get();
  const [password, setPassword] = useState('');
  const reset = useRef(false);   // the code is single-use: a retry after a failed sign-in only signs in

  useEffect(() => {
    if (!draft?.code) navigation.goBack();
  }, [draft, navigation]);

  const mutation = useMutation({
    mutationFn: async (newPassword: string) => {
      const current = resetDraft.get()!;
      if (!reset.current) {
        await identityApi.resetPassword({ requestId: current.requestId, code: current.code!, newPassword });
        reset.current = true;
      }
      await signIn({ email: current.email, password: newPassword });   // the session swaps to the app
      resetDraft.clear();
    },
  });

  if (!draft?.code) return null;

  const valid = isPassword(password);
  const codeExpired = isApiError(mutation.error) && mutation.error.code === IdentityErrorCodes.invalidCode;

  function submit() {
    if (valid && !mutation.isPending) mutation.mutate(password);
  }

  return (
    <Screen scroll edges={['bottom']}>
      <Text variant="title" style={{ marginTop: space.sm }}>
        {t('auth.reset.title')}
      </Text>
      <Text variant="callout" color="ink2" style={{ marginTop: space.xs, marginBottom: space.xxl }}>
        {t('auth.reset.subtitle', { email: draft.email })}
      </Text>

      <View style={{ gap: space.xl }}>
        {mutation.error && Object.keys(fieldErrors(mutation.error)).length === 0 && <Notice>{errorMessage(mutation.error)}</Notice>}
        <TextField
          label={t('auth.reset.newPassword')}
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            if (mutation.error) mutation.reset();
          }}
          error={fieldErrors(mutation.error).newPassword}
          footer={<RuleCheck met={valid} label={t('auth.signUp.passwordHint')} />}
          secureToggle={{ show: t('common.show'), hide: t('common.hide') }}
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          maxLength={limits.passwordMax}
          passwordRules={`minlength: ${limits.passwordMin};`}
          autoFocus
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        {codeExpired ? (
          <Button title={t('auth.reset.startOver')} onPress={() => navigation.navigate('ForgotPassword', { email: draft.email })} />
        ) : (
          <Button title={t('auth.reset.submit')} onPress={submit} disabled={!valid} loading={mutation.isPending} />
        )}
      </View>
    </Screen>
  );
}
