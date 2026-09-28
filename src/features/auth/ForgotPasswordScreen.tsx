import { useNavigation, type StaticScreenProps } from '@react-navigation/native';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { limits } from '@/core/validation/limits';
import { identityApi } from '@/data/identity/api';
import { errorMessage } from '@/shared/i18n/errors';
import { Button, Notice, Screen, Text, TextField, useTheme } from '@/shared/ui';

import { resetDraft } from './resetDraft';
import { useEmailField } from './useEmailField';

/**
 * POST /auth/forgot-password, then Reset code. The answer is the same whether or not the account exists.
 * Param: the email typed on Sign in, if any (not secret, so it can travel in the route).
 */
export function ForgotPasswordScreen({ route }: StaticScreenProps<{ email?: string } | undefined>) {
  const { t } = useTranslation();
  const { space } = useTheme();
  const navigation = useNavigation();
  const email = useEmailField(route.params?.email ?? '');

  const mutation = useMutation({
    mutationFn: (value: string) => identityApi.forgotPassword(value),
    onSuccess: ({ requestId }, value) => {
      resetDraft.start(value, requestId);
      navigation.navigate('ResetCode');
    },
  });

  function submit() {
    if (!email.valid) return email.reveal();
    if (!mutation.isPending) mutation.mutate(email.trimmed);
  }

  return (
    <Screen scroll edges={['bottom']}>
      <Text variant="title" style={{ marginTop: space.sm }}>
        {t('auth.forgot.title')}
      </Text>
      <Text variant="callout" color="ink2" style={{ marginTop: space.xs, marginBottom: space.xxl }}>
        {t('auth.forgot.subtitle')}
      </Text>

      <View style={{ gap: space.xl }}>
        {mutation.error && <Notice>{errorMessage(mutation.error)}</Notice>}
        <TextField
          label={t('auth.signIn.email')}
          value={email.value}
          onChangeText={(v) => {
            email.onChangeText(v);
            if (mutation.error) mutation.reset();
          }}
          onBlur={email.onBlur}
          error={email.errorKey && t(`auth.validation.${email.errorKey}`)}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="username"
          keyboardType="email-address"
          maxLength={limits.emailMax}
          returnKeyType="send"
          onSubmitEditing={submit}
        />
        <Button title={t('auth.forgot.submit')} onPress={submit} disabled={!email.valid} loading={mutation.isPending} />
        <Notice tone="info">{t('auth.forgot.note')}</Notice>
      </View>
    </Screen>
  );
}
