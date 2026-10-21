import { useNavigation } from '@react-navigation/native';
import { useRef } from 'react';
import { StyleSheet, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';

import { Text } from '@/shared/ui';

/** How far a list scrolls before the screen's own title (its first line, 32) is under the bar. */
const PAST = 32;

/**
 * A list screen's title in the bar once its own has scrolled away (M94). Pass `onScroll` to the FlashList and render
 * `BarTitle` with `shown` as the header title. The fade runs on the UI thread; JS only notes when the title crosses,
 * and turns the bar's hairline on or off then (no re-render of the screen).
 */
export function useBarTitle() {
  const navigation = useNavigation();
  const shown = useSharedValue(0);
  const past = useRef(false);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const now = e.nativeEvent.contentOffset.y > PAST;
    if (now === past.current) return;
    past.current = now;
    shown.value = withTiming(now ? 1 : 0, { duration: 180 });
    navigation.setOptions({ headerShadowVisible: now });
  };
  return { shown, onScroll };
}

/** The title and, under it, what the list shows (M94): "16 open · Soonest". Hidden until `shown`. */
export function BarTitle({ shown, title, line }: { shown: SharedValue<number>; title: string; line?: string }) {
  const style = useAnimatedStyle(() => ({ opacity: shown.value, transform: [{ translateY: (1 - shown.value) * 4 }] }));
  return (
    <Animated.View style={[styles.root, style]}>
      <Text variant="headline" numberOfLines={1}>{title}</Text>
      {!!line && <Text variant="caption" color="ink3" numberOfLines={1}>{line}</Text>}
    </Animated.View>
  );
}

const styles = StyleSheet.create({ root: { alignItems: 'center', maxWidth: 220 } });
