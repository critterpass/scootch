import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, withTiming } from 'react-native-reanimated';

import { useTextSizing } from '../../screens/registry/support/forced-variant';
import { useMayMove } from '../../ui/motion/use-feel';
import { useScreenStyle } from '../../ui/use-screen-style';

import { cappedSize, curves, ink, type } from './class-style';

/** The App board's bubble is at most this wide; at the largest text sizes it may take more. */
export const BUBBLE_WIDTH = 176;
/** Its distance from the screen's right edge at the desk. */
export const BUBBLE_RIGHT = 22;
/** His line grows with the text size up to this far, the same on a phone and in a capture. */
const BUBBLE_MAX_SCALE = 1.8;
/** Below the room's top, how far the desk keeps clear for his bubble at the largest sizes. */
export const BUBBLE_ROOM = 290;

/** The App board's bubble pop: from 60% and a little low at its tail, overshooting into place. */
function pop() {
  'worklet';
  const timing = { duration: 400, easing: curves.character };
  return {
    initialValues: { opacity: 0, transform: [{ scale: 0.6 }, { translateY: 10 }] },
    animations: {
      opacity: withTiming(1, timing),
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
  const { largeText } = useScreenStyle();
  const where =
    place === 'desk' ? { top: top + 118, right: BUBBLE_RIGHT } : { top: top + 64, left: 22 };
  const entering = mayMove ? pop : FadeIn.duration(200);
  return (
    <Animated.View
      key={text}
      entering={entering}
      style={[styles.bubble, where, { maxWidth: largeText ? '62%' : BUBBLE_WIDTH }]}
      accessibilityRole="text"
      accessibilityLiveRegion="polite"
      testID="his-line"
    >
      <Text
        allowFontScaling={sizing.allowFontScaling}
        maxFontSizeMultiplier={BUBBLE_MAX_SCALE}
        style={[
          type.rounded,
          styles.words,
          // The line height grows with the text, so large text never overlaps itself.
          {
            fontSize: cappedSize(sizing, 16, BUBBLE_MAX_SCALE),
            lineHeight: cappedSize(sizing, 20, BUBBLE_MAX_SCALE),
          },
        ]}
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: ink.white,
    boxShadow: '0 6px 16px rgba(30,40,30,0.16)',
    zIndex: 3,
    transformOrigin: '20% 100%',
  },
  words: { color: ink.text },
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
