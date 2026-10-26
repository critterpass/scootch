import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, withTiming } from 'react-native-reanimated';

import { useTextSizing } from '../../screens/registry/support/forced-variant';
import { useMayMove } from '../../ui/motion/use-feel';

import { curves, ink, type } from './class-style';

/** The App board's bubble pop: from 60% and a little low, overshooting into place. */
function pop() {
  'worklet';
  const timing = { duration: 400, easing: curves.character };
  return {
    initialValues: { opacity: 0, transform: [{ scale: 0.6 }, { translateY: 10 }] },
    animations: {
      opacity: withTiming(1, { duration: 200 }),
      transform: [{ scale: withTiming(1, timing) }, { translateY: withTiming(0, timing) }],
    },
  };
}

/**
 * His line in a white bubble. A new line pops in from its tail on the character curve; with
 * nothing allowed to move it fades. `place` puts it beside him: top right at the desk, top left
 * when the camera has pulled back.
 */
export function SpeechBubble({
  text,
  place,
  top = 0,
}: {
  readonly text: string;
  readonly place: 'desk' | 'room';
  /** Where the room starts on screen: the bubble keeps its place beside him. */
  readonly top?: number;
}) {
  const mayMove = useMayMove();
  const sizing = useTextSizing();
  const where = place === 'desk' ? { top: top + 118, right: 22 } : { top: top + 64, left: 22 };
  const entering = mayMove ? pop : FadeIn.duration(200);
  return (
    <Animated.View
      key={text}
      entering={entering}
      style={[styles.bubble, where]}
      accessibilityRole="text"
      accessibilityLiveRegion="polite"
      testID="his-line"
    >
      <Text
        allowFontScaling={sizing.allowFontScaling}
        maxFontSizeMultiplier={1.8}
        style={[type.rounded, styles.words, { fontSize: sizing.size(16) }]}
      >
        {text}
      </Text>
      <View style={[styles.tail, place === 'desk' ? { left: 30 } : { right: 30 }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    maxWidth: 200,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: ink.white,
    boxShadow: '0 6px 16px rgba(30,40,30,0.16)',
    zIndex: 3,
  },
  words: { color: ink.text, lineHeight: 20 },
  tail: {
    position: 'absolute',
    bottom: -6,
    width: 16,
    height: 16,
    backgroundColor: ink.white,
    borderRadius: 3,
    transform: [{ rotate: '45deg' }],
    zIndex: -1,
  },
});
