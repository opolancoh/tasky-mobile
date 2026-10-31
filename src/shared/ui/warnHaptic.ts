import * as Haptics from 'expo-haptics';

/** The tap that comes with a red line saying what's wrong (M123). */
export const warnHaptic = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
