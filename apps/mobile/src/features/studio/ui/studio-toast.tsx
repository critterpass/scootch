import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fonts } from '@scootch/tokens';

import { BOUNCE_CURVE, CROSSFADE_MS } from '../../../ui/motion/motion-tokens';
import { useScreenStyle } from '../../../ui/use-screen-style';

/** The board's toast is ink with white words in both appearances, and a tomato tick. */
const INK = '#1C1A17';
const TICK = '#F0562E';
/** It rests this far under the status bar: just below the tabs. */
const UNDER_BAR = 58;
/** It drops in from a little above with a bounce, as the board scripts it. */
const DROP = { ms: 520, fromY: -24, fromScale: 0.92 } as const;

/**
 * What is said once after something is bought: a dark capsule under the tabs with a tick. It
 * drops in, is read out, and leaves when its words are taken away. It never takes a touch.
 */
export function StudioToast({ text }: { readonly text: string | null }) {
  const { reducedMotion, allowFontScaling, size } = useScreenStyle();
  const insets = useSafeAreaInsets();
  // The words stay while it fades out, after the screen has stopped giving them.
  const [words, setWords] = useState(text);
  const shown = useSharedValue(0);
  useEffect(() => {
    if (text !== null) {
      setWords(text);
      shown.value = 0;
      shown.value = reducedMotion
        ? withTiming(1, { duration: CROSSFADE_MS })
        : withTiming(1, { duration: DROP.ms, easing: BOUNCE_CURVE });
      return undefined;
    }
    shown.value = withTiming(0, { duration: CROSSFADE_MS });
    const gone = setTimeout(() => setWords(null), CROSSFADE_MS);
    return () => clearTimeout(gone);
  }, [text, reducedMotion, shown]);
  const dropped = useAnimatedStyle(() => {
    const k = shown.value;
    if (reducedMotion) return { opacity: Math.min(1, k) };
    return {
      opacity: Math.min(1, k),
      transform: [
        { translateY: DROP.fromY * (1 - k) },
        { scale: DROP.fromScale + (1 - DROP.fromScale) * k },
      ],
    };
  }, [reducedMotion]);
  if (words === null) return null;
  return (
    <Animated.View
      pointerEvents="none"
      accessible
      accessibilityLiveRegion="polite"
      accessibilityLabel={words}
      testID="studio-toast"
      style={[styles.toast, { top: insets.top + UNDER_BAR }, dropped]}
    >
      <View style={styles.badge}>
        <View style={styles.tick} />
      </View>
      <Text
        allowFontScaling={allowFontScaling}
        maxFontSizeMultiplier={1.6}
        style={[styles.words, { fontSize: size(14), lineHeight: size(14) * 1.35 }]}
      >
        {words}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 22,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: INK,
    boxShadow: '0 18px 40px -12px rgba(28,26,23,0.5)',
  },
  badge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: TICK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tick: {
    width: 10,
    height: 6,
    borderLeftWidth: 2.4,
    borderBottomWidth: 2.4,
    borderColor: '#FFFFFF',
    transform: [{ translateY: -1 }, { rotate: '-45deg' }],
  },
  words: { flex: 1, color: '#FFFFFF', fontFamily: fonts.body, fontWeight: '500' },
});
