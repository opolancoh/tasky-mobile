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
