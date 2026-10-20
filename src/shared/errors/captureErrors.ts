import { isApiError } from '@/core/http/problem';

import { recordError, useErrorReports } from './errorReports';

interface HermesTracker {
  enablePromiseRejectionTracker?(options: { allRejections: boolean; onUnhandled(id: number, rejection: unknown): void; onHandled(id: number): void }): void;
}

let installed = false;

/**
 * Catches what the error boundary can't (M89): any error reaching React Native's global handler, and promises nobody
 * handled. A fatal one shows Something went wrong instead of closing the app. In development React Native's own
 * handlers still run too (LogBox).
 */
export function installErrorCapture() {
  if (installed) return;
  installed = true;

  const previous = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    const id = recordError(error, 'global', !!isFatal);
    if (isFatal) useErrorReports.setState({ crashed: id });
    if (__DEV__) previous(error, isFatal);
  });

  const hermes = (globalThis as { HermesInternal?: HermesTracker }).HermesInternal;
  hermes?.enablePromiseRejectionTracker?.({
    allRejections: true,
    onUnhandled: (_id, rejection) => {
      if (__DEV__) console.warn('Unhandled promise rejection', rejection);
      // A failed API call nobody caught isn't a bug of its own: the API logs its 500s, and offline isn't an error (M90).
      if (!isApiError(rejection)) recordError(rejection, 'promise', false);
    },
    onHandled: () => {},
  });
}
