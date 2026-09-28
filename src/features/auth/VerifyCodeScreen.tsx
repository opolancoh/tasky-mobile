import { useNavigation } from '@react-navigation/native';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { identityApi } from '@/data/identity/api';
import { useSession } from '@/shared/session/SessionProvider';

import { CodeStep } from './components/CodeStep';
import { signUpDraft } from './signUpDraft';

/** POST /auth/verify-email, then sign in with the sign-up's email and password (06-mobile.md, Session). */
export function VerifyCodeScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { signIn } = useSession();
  const draft = signUpDraft.get();
  const verified = useRef(false);   // the code is single-use: a retry after a failed sign-in skips verifying

  useEffect(() => {
    if (!draft) navigation.goBack();   // e.g. after a reload: the draft lives in memory only
  }, [draft, navigation]);

  const verify = useMutation({
    mutationFn: async (code: string) => {
      const current = signUpDraft.get()!;
      if (!verified.current) {
        await identityApi.verifyEmail({ requestId: current.requestId, code });
        verified.current = true;
      }
      await signIn({ email: current.email, password: current.password });   // the session swaps to the app
      signUpDraft.clear();
    },
  });

  if (!draft) return null;

  return (
    <CodeStep
      email={draft.email}
      submitLabel={t('auth.verify.submit')}
      onSubmit={(code) => verify.mutate(code)}
      pending={verify.isPending}
      error={verify.error}
      onEdit={() => verify.error && verify.reset()}
      onResend={async () => {
        const { requestId } = await identityApi.resendVerification(signUpDraft.get()!.requestId);
        signUpDraft.setRequestId(requestId);
        verify.reset();
      }}
    />
  );
}
