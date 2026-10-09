import { useNavigation } from '@react-navigation/native';
import { useMutation } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View, type TextInput } from 'react-native';

import { limits } from '@/core/validation/limits';
import { errorMessage, fieldErrors } from '@/shared/i18n/errors';
import { useSession } from '@/shared/session/SessionProvider';
import { Button, Logo, Notice, Screen, Text, TextField, useTheme } from '@/shared/ui';

import { useEmailField } from './useEmailField';
import { validateSignIn, type SignInField } from './validation';

/** POST /auth/login, then /me (06-mobile.md, Session). */
export function SignInScreen() {
  const { t } = useTranslation();
  const { space } = useTheme();
  const { signIn } = useSession();
  const navigation = useNavigation();
  const passwordRef = useRef<TextInput>(null);

  const emailField = useEmailField();
  const email = emailField.value;
  const [password, setPassword] = useState('');
  const [localErrors, setLocalErrors] = useState<Partial<Record<SignInField, string>>>({});

  const mutation = useMutation({ mutationFn: signIn });
  const serverFields = fieldErrors(mutation.error);
  const formError = mutation.error && Object.keys(serverFields).length === 0 ? errorMessage(mutation.error) : undefined;

  const fieldError = (field: SignInField) => {
    const key = localErrors[field] ?? (field === 'email' ? emailField.errorKey : undefined);   // email: checked on leaving the field
    return key ? t(`auth.validation.${key}`) : serverFields[field];
  };

  function submit() {
    const errors = validateSignIn(email, password);
    setLocalErrors(errors);
    if (Object.keys(errors).length > 0 || mutation.isPending) return;
    mutation.mutate({ email: email.trim(), password });
  }

  function edit(field: SignInField, value: string) {
    (field === 'email' ? emailField.onChangeText : setPassword)(value);
    if (localErrors[field]) setLocalErrors((e) => ({ ...e, [field]: undefined }));
    if (mutation.error) mutation.reset();
  }

  return (
    <Screen scroll>
      <View style={[styles.brand, { marginTop: space.huge, marginBottom: space.huge - space.sm }]}>
        <Logo />
      </View>

      <Text variant="title" align="center">
        {t('auth.signIn.title')}
      </Text>
      <Text variant="callout" color="ink2" align="center" style={{ marginTop: space.xs, marginBottom: space.xxxl }}>
        {t('auth.signIn.subtitle')}
      </Text>

      <View style={{ gap: space.xl }}>
        {formError && <Notice>{formError}</Notice>}

        <TextField
          label={t('auth.signIn.email')}
          value={email}
          onChangeText={(v) => edit('email', v)}
          onBlur={emailField.onBlur}
          error={fieldError('email')}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="username"
          keyboardType="email-address"
          maxLength={limits.emailMax}
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          submitBehavior="submit"
        />
        <TextField
          ref={passwordRef}
          label={t('auth.signIn.password')}
          value={password}
          onChangeText={(v) => edit('password', v)}
          error={fieldError('password')}
          secureToggle={{ show: t('common.show'), hide: t('common.hide') }}
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
        />

        <View style={styles.forgot}>
          <Button variant="link" title={t('auth.signIn.forgot')} onPress={() => navigation.navigate('ForgotPassword', { email: emailField.trimmed || undefined })} />
        </View>

        <View>
          <Button title={t('auth.signIn.submit')} onPress={submit} loading={mutation.isPending} />
        </View>
      </View>

      <View style={[styles.footer, { paddingTop: space.xxxl, paddingBottom: space.lg }]}>
        <Text variant="subhead" color="ink2">
          {t('auth.signIn.newHere')}{' '}
        </Text>
        <Button variant="link" title={t('auth.signIn.createAccount')} onPress={() => navigation.navigate('SignUp')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: { alignItems: 'center' },
  forgot: { alignItems: 'flex-end', marginTop: -12, marginBottom: -8 },
  footer: { marginTop: 'auto', flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
});
