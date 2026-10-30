import type { ApiError } from '@/core/http/problem';
import { useToast } from '@/shared/ui';

import i18n from '@/shared/i18n/i18n';

import { detailsAllowed, showErrorDetails } from './errorDetails';

/** What Try again repeats: the last action or refresh that couldn't reach Azignia. */
let lastRetry: (() => void) | null = null;
/** When the capsule last appeared: one failure can reach it from the query client and from the screen's own onError. */
let shownAt = 0;
const SAME_FAILURE_MS = 1000;

/** From the query client: the action or refresh that just failed for lack of a connection. */
export function setConnectionRetry(retry: () => void) {
  lastRetry = retry;
}

/**
 * Can't connect (M90): a capsule above the tab bar, "Can't connect to Azignia" with Try again, which repeats what failed.
 * One at a time, and once per failure (a second call within a second is the same one). Only for actions and refreshes;
 * a form keeps its Notice, a screen with nothing to show uses LoadError. Try again runs the action again; the screen's
 * own follow-ups (a toast, closing) still run when it succeeds, as long as that screen is open. Support and admin tap the
 * message for what failed (M119).
 */
export function showCantConnect(retry: (() => void) | null = lastRetry, error?: ApiError) {
  const shown = useToast.getState().current?.icon === 'cloud-off';
  if (shown && Date.now() - shownAt < SAME_FAILURE_MS) return;
  shownAt = Date.now();
  useToast.getState().show({
    message: i18n.t('connection.cantConnect'),
    icon: 'cloud-off',
    action: retry ? { label: i18n.t('common.retry'), onPress: retry } : undefined,
    onPress: error && detailsAllowed() ? () => void showErrorDetails(error) : undefined,
  });
}
