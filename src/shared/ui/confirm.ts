import { ActionSheetIOS, Alert, Platform } from 'react-native';

export interface ConfirmOptions {
  title: string;
  message?: string;
  /** The action, e.g. "Delete task". */
  confirmLabel: string;
  cancelLabel: string;
  /** Red, for actions that remove something. */
  destructive?: boolean;
}

/**
 * Asks before an action that removes or drops something (delete, discard): an action sheet on iOS, an alert on
 * Android (HIG, Material). Resolves true when confirmed. Every delete in the app asks through this.
 */
export function confirm({ title, message, confirmLabel, cancelLabel, destructive = true }: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { title, message, options: [confirmLabel, cancelLabel], destructiveButtonIndex: destructive ? 0 : undefined, cancelButtonIndex: 1 },
        (i) => resolve(i === 0),
      );
      return;
    }
    Alert.alert(title, message, [
      { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}

export interface AskReasonOptions extends ConfirmOptions {
  /** Longest reason accepted. */
  maxLength?: number;
}

/**
 * Asks before an action that takes an optional reason (rejecting an assignment): a text prompt on iOS; on Android,
 * which has no text alert, the same choice as `confirm` without the reason. Resolves the reason ('' when none), or
 * null when cancelled.
 */
export function askReason({ title, message, confirmLabel, cancelLabel, destructive = true, maxLength = 500 }: AskReasonOptions): Promise<string | null> {
  if (Platform.OS !== 'ios') return confirm({ title, message, confirmLabel, cancelLabel, destructive }).then((ok) => (ok ? '' : null));
  return new Promise((resolve) => {
    Alert.prompt(
      title,
      message,
      [
        { text: cancelLabel, style: 'cancel', onPress: () => resolve(null) },
        { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: (text?: string) => resolve((text ?? '').trim().slice(0, maxLength)) },
      ],
      'plain-text',
    );
  });
}

export interface ActionChoice {
  label: string;
  /** Red, for actions that remove or leave something. */
  destructive?: boolean;
}

/**
 * A native menu of actions for one thing (a long press on a row, a ••• button): an action sheet on iOS, an alert with
 * the choices on Android. Resolves the index of the chosen action, or null when cancelled.
 */
export function chooseAction({ title, actions, cancelLabel }: { title: string; actions: ActionChoice[]; cancelLabel: string }): Promise<number | null> {
  return new Promise((resolve) => {
    if (Platform.OS === 'ios') {
      const destructive = actions.map((a, i) => (a.destructive ? i : -1)).filter((i) => i >= 0);
      ActionSheetIOS.showActionSheetWithOptions(
        { title, options: [...actions.map((a) => a.label), cancelLabel], destructiveButtonIndex: destructive, cancelButtonIndex: actions.length },
        (i) => resolve(i < actions.length ? i : null),
      );
      return;
    }
    Alert.alert(title, undefined, [
      ...actions.map((a, i) => ({ text: a.label, style: a.destructive ? ('destructive' as const) : ('default' as const), onPress: () => resolve(i) })),
      { text: cancelLabel, style: 'cancel', onPress: () => resolve(null) },
    ], { cancelable: true, onDismiss: () => resolve(null) });
  });
}
