import { useEffect } from 'react';
import { Dimensions, Keyboard } from 'react-native';
import { useAnimatedKeyboard, useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated';

/**
 * The keyboard's height as a shared value, following every frame change (M120). Reanimated misses a keyboard that
 * grows once open (third-party keyboards report a short frame first), so on iOS React Native's frame events keep it right.
 */
export function useKeyboardHeight() {
  const keyboard = useAnimatedKeyboard({ isStatusBarTranslucentAndroid: true, isNavigationBarTranslucentAndroid: true });
  const reported = useSharedValue(0);

  useEffect(() => {
    // Only iOS sends this event; a floating keyboard reports a narrow or empty frame and covers nothing.
    const sub = Keyboard.addListener('keyboardWillChangeFrame', ({ endCoordinates: end, duration }) => {
      const window = Dimensions.get('window');
      const height = end.width < window.width ? 0 : Math.max(window.height - end.screenY, 0);
      // Closing follows Reanimated's curve; a new height eases in, behind Reanimated's while it opens.
      reported.value = height === 0 ? 0 : withTiming(height, { duration: duration || 250 });
    });
    return () => sub.remove();
  }, [reported]);

  return useDerivedValue(() => Math.max(keyboard.height.value, reported.value));
}
