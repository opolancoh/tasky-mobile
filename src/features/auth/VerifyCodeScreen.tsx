import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { limits } from '@/core/validation/limits';
import { isCode } from '@/core/validation/rules';
import { identityApi } from '@/data/identity/api';
import { errorMessage } from '@/shared/i18n/errors';
import { useSession } from '@/shared/session/SessionProvider';
import { Button, Notice, Screen, Text, useTheme } from '@/shared/ui';

import { CodeInput } from './components/CodeInput';
import { signUpDraft } from './signUpDraft';

/** POST /auth/verify-email, then sign in with the sign-up's email and password (06-mobile.md, Session). */
export function VerifyCodeScreen() {
  const { t } = useTranslation();
  const { colors, radius, space } = useTheme();
  const navigation = useNavigation();
  const { signIn } = useSession();
  const draft = signUpDraft.get();

  const [code, setCode] = useState('');
  const [incomplete, setIncomplete] = useState(false);
  const verified = useRef(false);   // the code is single-use: a retry after a failed sign-in skips verifying

  useEffect(() => {
    if (!draft) navigation.goBack();   // e.g. after a reload: the draft lives in memory only
  }, [draft, navigation]);

  const verify = useMutation({
    mutationFn: async (value: string) => {
      const current = signUpDraft.get()!;
      if (!verified.current) {
        await identityApi.verifyEmail({ requestId: current.requestId, code: value });
        verified.current = true;
      }
      await signIn({ email: current.email, password: current.password });   // the session swaps to the app
      signUpDraft.clear();
    },
  });

  const resend = useMutation({
    mutationFn: () => identityApi.resendVerification(signUpDraft.get()!.requestId),
    onSuccess: ({ requestId }) => {
      signUpDraft.setRequestId(requestId);
      setCode('');
      verify.reset();
    },
  });

  function submit(value = code) {
    if (!isCode(value)) {
      setIncomplete(true);
      return;
    }
    if (!verify.isPending) verify.mutate(value);
  }

  if (!draft) return null;

  const error = incomplete ? t('auth.validation.codeIncomplete') : verify.error ? errorMessage(verify.error) : undefined;

  return (
    <Screen scroll edges={['bottom']}>
      <View style={[styles.icon, { backgroundColor: colors.accentSoft, borderRadius: radius.xl - 4, marginTop: space.sm, marginBottom: space.xl }]}>
        <Feather name="mail" size={26} color={colors.accent} />
      </View>
      <Text variant="title">{t('auth.verify.title')}</Text>
      <Text variant="callout" color="ink2" style={{ marginTop: space.xs, marginBottom: space.xxl }}>
        {t('auth.verify.subtitle', { email: draft.email })}
      </Text>

      <View style={{ gap: space.lg }}>
        {resend.isSuccess && !verify.error && <Notice tone="info">{t('auth.verify.resent', { email: draft.email })}</Notice>}
        {resend.error && <Notice>{errorMessage(resend.error)}</Notice>}

        <CodeInput
          value={code}
          length={limits.codeLength}
          hasError={!!error}
          accessibilityLabel={t('auth.verify.code')}
          onChange={(v) => {
            setCode(v);
            setIncomplete(false);
            if (verify.error) verify.reset();
          }}
          onFilled={submit}
        />
        {error && (
          <Text variant="footnote" color="danger" accessibilityLiveRegion="polite">
            {error}
          </Text>
        )}

        <View style={{ marginTop: space.sm }}>
          <Button title={t('auth.verify.submit')} onPress={() => submit()} loading={verify.isPending} />
        </View>

        <View style={styles.resend}>
          <Text variant="subhead" color="ink2">
            {t('auth.verify.noCode')}{' '}
          </Text>
          <Button variant="link" title={t('auth.verify.resend')} onPress={() => resend.mutate()} disabled={resend.isPending} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  icon: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  resend: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8 },
});
