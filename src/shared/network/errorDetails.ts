import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { isApiError, type ApiError } from '@/core/http/problem';
import { http } from '@/data/http';
import { appInfo } from '@/shared/appInfo';
import i18n from '@/shared/i18n/i18n';
import { useSessionStore } from '@/shared/session/sessionStore';
import { confirm, useToast } from '@/shared/ui';

interface ErrorDetailsState {
  /** The user has a platform role (support or admin): kept on the device, so launch can tell with no API. */
  allowed: boolean;
  /** The last failure to reach Azignia (Can't reach Azignia at launch). */
  last: ApiError | null;
}

/**
 * Error details (M119): what failed when Azignia can't be reached, for support and admin only (as the Network log, M53),
 * on the launch screen, the Can't connect page and capsule. Signing out forgets it.
 */
export const useErrorDetails = create<ErrorDetailsState>()(
  persist((): ErrorDetailsState => ({ allowed: false, last: null }), {
    name: 'azignia.errorDetails',
    storage: createJSONStorage(() => AsyncStorage),
    partialize: (s) => ({ allowed: s.allowed }),
  }),
);

export const setErrorDetailsAllowed = (allowed: boolean) => useErrorDetails.setState({ allowed });

export function rememberConnectionError(error: unknown) {
  if (isApiError(error)) useErrorDetails.setState({ last: error });
}

useSessionStore.subscribe((s, prev) => {
  if (s.status === 'signedOut' && prev.status !== 'signedOut') useErrorDetails.setState({ allowed: false, last: null });
});

/** Label and value of each line: what failed, the call, its status and code, the API, its trace id, when, this app. */
export function detailRows(error: ApiError): [string, string][] {
  const t = i18n.t;
  const problem = error.code === 'network' ? t('errorDetails.network')
    : error.code === 'timeout' ? t('errorDetails.timeout')
    : error.status >= 500 ? t('errorDetails.server')
    : t('errorDetails.http', { status: error.status });
  return [
    [t('errorDetails.problem'), problem],
    [t('errorDetails.request'), error.request ?? '—'],
    [t('errorDetails.status'), error.status ? `${error.status} · ${error.code}` : error.code],
    [t('errorDetails.api'), http().baseUrl],
    [t('errorDetails.trace'), error.traceId ?? '—'],
    [t('errorDetails.when'), error.at],
    [t('errorDetails.app'), `${appInfo.version}${appInfo.build ? ` (${appInfo.build})` : ''} · ${Platform.OS}`],
  ];
}

export async function copyErrorDetails(error: ApiError) {
  await Clipboard.setStringAsync(detailRows(error).map(([k, v]) => `${k}: ${v}`).join('\n'));
  useToast.getState().show({ message: i18n.t('errorDetails.copied') });
}

/** From the Can't connect capsule: the details in a dialog, with Copy. */
export async function showErrorDetails(error: ApiError) {
  const copy = await confirm({
    title: i18n.t('errorDetails.title'),
    message: detailRows(error).map(([k, v]) => `${k}: ${v}`).join('\n'),
    confirmLabel: i18n.t('errorDetails.copy'),
    cancelLabel: i18n.t('common.close'),
    destructive: false,
  });
  if (copy) await copyErrorDetails(error);
}
