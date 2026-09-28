import { useNavigation } from '@react-navigation/native';
import { useMutation } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View, type TextInput } from 'react-native';

import { limits } from '@/core/validation/limits';
import { isFilled, isPassword } from '@/core/validation/rules';
import { identityApi } from '@/data/identity/api';
import type { RegisterRequest } from '@/data/identity/types';
import { errorMessage, fieldErrors } from '@/shared/i18n/errors';
import { deviceLanguage, deviceTimeZone } from '@/shared/i18n/i18n';
import { Button, Notice, RuleCheck, Screen, Text, TextField, useTheme } from '@/shared/ui';

import { signUpDraft } from './signUpDraft';
import { useEmailField } from './useEmailField';

/**
 * POST /auth/register with the device's time zone and language, then Verify code.
 * HIG: the email is checked when you leave it, the password rule as you type, and Create account
 * waits until the form is complete.
 */
export function SignUpScreen() {
  const { t } = useTranslation();
  const { space } = useTheme();
  const navigation = useNavigation();
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const [displayName, setDisplayName] = useState('');
  const [nameLeft, setNameLeft] = useState(false);
  const email = useEmailField();
  const [password, setPassword] = useState('');
  const timeZone = deviceTimeZone();
  const language = deviceLanguage();

  const mutation = useMutation({
    mutationFn: (body: RegisterRequest) => identityApi.register(body),
    onSuccess: ({ requestId }, body) => {
      signUpDraft.set({ requestId, email: body.email, password: body.password });
      navigation.navigate('VerifyCode');
    },
  });
  const serverFields = fieldErrors(mutation.error);
  const formError = mutation.error && Object.keys(serverFields).length === 0 ? errorMessage(mutation.error) : undefined;

  const nameError = nameLeft && !isFilled(displayName) ? t('auth.validation.nameRequired') : serverFields.displayName;
  const emailError = email.errorKey ? t(`auth.validation.${email.errorKey}`) : serverFields.email;
  const complete = isFilled(displayName) && email.valid && isPassword(password);

  function submit() {
    if (!complete) {
      setNameLeft(true);
      email.reveal();
      return;
    }
    if (!mutation.isPending) mutation.mutate({ displayName: displayName.trim(), email: email.trimmed, password, timeZone, language });
  }

  function clearServerError() {
    if (mutation.error) mutation.reset();
  }

  return (
    <Screen scroll edges={['bottom']}>
      <Text variant="title" style={{ marginTop: space.sm }}>
        {t('auth.signUp.title')}
      </Text>
      <Text variant="callout" color="ink2" style={{ marginTop: space.xs, marginBottom: space.xxl }}>
        {t('auth.signUp.subtitle')}
      </Text>

      <View style={{ gap: space.xl }}>
        {formError && <Notice>{formError}</Notice>}

        <TextField
          label={t('auth.signUp.name')}
          value={displayName}
          onChangeText={(v) => {
            setDisplayName(v);
            clearServerError();
          }}
          onBlur={() => setNameLeft(true)}
          error={nameError}
          autoComplete="name"
          textContentType="name"
          maxLength={limits.displayNameMax}
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => emailRef.current?.focus()}
        />
        <TextField
          ref={emailRef}
          label={t('auth.signUp.email')}
          value={email.value}
          onChangeText={(v) => {
            email.onChangeText(v);
            clearServerError();
          }}
          onBlur={email.onBlur}
          error={emailError}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          keyboardType="email-address"
          maxLength={limits.emailMax}
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <TextField
          ref={passwordRef}
          label={t('auth.signUp.password')}
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            clearServerError();
          }}
          error={serverFields.password}
          footer={<RuleCheck met={isPassword(password)} label={t('auth.signUp.passwordHint')} />}
          secureToggle={{ show: t('common.show'), hide: t('common.hide') }}
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          maxLength={limits.passwordMax}
          passwordRules={`minlength: ${limits.passwordMin};`}
          returnKeyType="go"
          onSubmitEditing={submit}
        />

        <View style={styles.deviceRow}>
          <Text variant="footnote" color="ink2">
            {t('auth.signUp.timeZone')} <Text variant="label">{timeZone}</Text>
          </Text>
          <Text variant="footnote" color="ink2">
            {t('auth.signUp.language')} <Text variant="label">{t(`languages.${language}`)}</Text>
          </Text>
        </View>

        <Notice tone="info">{t('auth.signUp.invited')}</Notice>

        <View style={{ marginTop: space.xs, marginBottom: space.xl }}>
          <Button title={t('auth.signUp.submit')} onPress={submit} disabled={!complete} loading={mutation.isPending} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  deviceRow: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
});
