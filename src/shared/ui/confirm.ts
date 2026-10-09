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
