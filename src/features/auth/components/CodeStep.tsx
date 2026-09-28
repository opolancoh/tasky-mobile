import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { limits } from '@/core/validation/limits';
import { isCode } from '@/core/validation/rules';
import { errorMessage } from '@/shared/i18n/errors';
import { Button, Notice, Screen, Text, useTheme } from '@/shared/ui';

import { CodeInput } from './CodeInput';

interface CodeStepProps {
  email: string;
  submitLabel: string;
  /** Called with a complete code: when the last digit is typed, or on the button. */
  onSubmit(code: string): void;
  pending: boolean;
  /** The submit's error, shown under the code. */
  error: unknown;
  /** Clears the submit's error when the code is edited. */
  onEdit(): void;
  /** Sends a new code. Resolves when sent; the code boxes clear then. */
  onResend(): Promise<unknown>;
}

/** "Check your email" with six code boxes: shared by Verify code (sign-up) and Reset code. */
export function CodeStep({ email, submitLabel, onSubmit, pending, error, onEdit, onResend }: CodeStepProps) {
  const { t } = useTranslation();
  const { colors, radius, space } = useTheme();
  const [code, setCode] = useState('');
  const [resend, setResend] = useState<{ state: 'idle' | 'sending' | 'sent' } | { state: 'failed'; error: unknown }>({ state: 'idle' });

  async function resendCode() {
    setResend({ state: 'sending' });
    try {
      await onResend();
      setCode('');
      setResend({ state: 'sent' });
    } catch (e) {
      setResend({ state: 'failed', error: e });
    }
  }

  function submit(value = code) {
    if (isCode(value) && !pending) onSubmit(value);
  }

  const message = error ? errorMessage(error) : undefined;

  return (
    <Screen scroll edges={['bottom']}>
      <View style={[styles.icon, { backgroundColor: colors.accentSoft, borderRadius: radius.xl - 4, marginTop: space.sm, marginBottom: space.xl }]}>
        <Feather name="mail" size={26} color={colors.accent} />
      </View>
      <Text variant="title">{t('auth.verify.title')}</Text>
      <Text variant="callout" color="ink2" style={{ marginTop: space.xs, marginBottom: space.xxl }}>
        {t('auth.verify.subtitle', { email })}
      </Text>

      <View style={{ gap: space.lg }}>
        {resend.state === 'sent' && !error && <Notice tone="info">{t('auth.verify.resent', { email })}</Notice>}
        {resend.state === 'failed' && <Notice>{errorMessage(resend.error)}</Notice>}

        <CodeInput
          value={code}
          length={limits.codeLength}
          hasError={!!message}
          accessibilityLabel={t('auth.verify.code')}
          onChange={(v) => {
            setCode(v);
            onEdit();
          }}
          onFilled={submit}
        />
        {message && (
          <Text variant="footnote" color="danger" accessibilityLiveRegion="polite">
            {message}
          </Text>
        )}

        <View style={{ marginTop: space.sm }}>
          <Button title={submitLabel} onPress={() => submit()} disabled={!isCode(code)} loading={pending} />
        </View>

        <View style={styles.resend}>
          <Text variant="subhead" color="ink2">
            {t('auth.verify.noCode')}{' '}
          </Text>
          <Button variant="link" title={t('auth.verify.resend')} onPress={resendCode} disabled={resend.state === 'sending'} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  icon: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  resend: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8 },
});
