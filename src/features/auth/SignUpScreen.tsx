import { useNavigation } from '@react-navigation/native';
import { useMutation } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View, type TextInput } from 'react-native';

import { limits } from '@/core/validation/limits';
import { identityApi } from '@/data/identity/api';
import type { RegisterRequest } from '@/data/identity/types';
import { errorMessage, fieldErrors } from '@/shared/i18n/errors';
import { deviceLanguage, deviceTimeZone } from '@/shared/i18n/i18n';
import { Button, Notice, Screen, Text, TextField, useTheme } from '@/shared/ui';

import { signUpDraft } from './signUpDraft';
import { validateSignUp, type SignUpField } from './validation';

/** POST /auth/register with the device's time zone and language, then Verify code. */
export function SignUpScreen() {
  const { t } = useTranslation();
  const { space } = useTheme();
  const navigation = useNavigation();
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localErrors, setLocalErrors] = useState<Partial<Record<SignUpField, string>>>({});
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

  const fieldError = (field: SignUpField) =>
    localErrors[field] ? t(`auth.validation.${localErrors[field]}`) : serverFields[field];

  function submit() {
    const errors = validateSignUp(displayName, email, password);
    setLocalErrors(errors);
    if (Object.keys(errors).length > 0 || mutation.isPending) return;
    mutation.mutate({ displayName: displayName.trim(), email: email.trim(), password, timeZone, language });
  }

  function edit(field: SignUpField, set: (v: string) => void, value: string) {
    set(value);
    if (localErrors[field]) setLocalErrors((e) => ({ ...e, [field]: undefined }));
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
          onChangeText={(v) => edit('displayName', setDisplayName, v)}
          error={fieldError('displayName')}
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
          value={email}
          onChangeText={(v) => edit('email', setEmail, v)}
          error={fieldError('email')}
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
          onChangeText={(v) => edit('password', setPassword, v)}
          error={fieldError('password')}
          hint={t('auth.signUp.passwordHint')}
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
          <Button title={t('auth.signUp.submit')} onPress={submit} loading={mutation.isPending} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  deviceRow: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
});
