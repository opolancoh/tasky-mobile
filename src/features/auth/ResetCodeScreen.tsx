import { useNavigation } from '@react-navigation/native';
import { useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { identityApi } from '@/data/identity/api';

import { CodeStep } from './components/CodeStep';
import { resetDraft } from './resetDraft';

/** POST /auth/validate-reset-code, then New password. "Resend" asks forgot-password again for a new code. */
export function ResetCodeScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const draft = resetDraft.get();

  useEffect(() => {
    if (!draft) navigation.goBack();   // memory only: gone after a reload
  }, [draft, navigation]);

  const check = useMutation({
    mutationFn: (code: string) => identityApi.validateResetCode({ requestId: resetDraft.get()!.requestId, code }),
    onSuccess: (_, code) => {
      resetDraft.update({ code });
      navigation.navigate('NewPassword');
    },
  });

  if (!draft) return null;

  return (
    <CodeStep
      email={draft.email}
      submitLabel={t('auth.reset.continue')}
      onSubmit={(code) => check.mutate(code)}
      pending={check.isPending}
      error={check.error}
      onEdit={() => check.error && check.reset()}
      onResend={async () => {
        const { requestId } = await identityApi.forgotPassword(draft.email);
        resetDraft.update({ requestId, code: undefined });
        check.reset();
      }}
    />
  );
}
