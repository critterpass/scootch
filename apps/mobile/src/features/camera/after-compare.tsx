import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { radius, spacing } from '@scootch/tokens';

import { SessionText } from '../session/ui/session-text';

const WHITE = '#FFFFFF';
const SHADE = 'rgba(0,0,0,0.55)';

/**
 * The two photos under one handle: the first fills the frame, and the second covers it from the
 * handle to the right. Dragging the handle uncovers more of one or the other. A screen reader
 * hears the two labels; the comparison itself is for the eye.
 */
export function Compare({
  beforeUri,
  afterUri,
  before,
  after,
  hint,
}: {
  readonly beforeUri: string;
  readonly afterUri: string;
  readonly before: string;
  readonly after: string;
  readonly hint: string;
}) {
  const [width, setWidth] = useState(0);
  const split = useSharedValue(0.5);
  const start = useSharedValue(0.5);
  const drag = Gesture.Pan()
    .onBegin(() => {
      start.value = split.value;
    })
    .onUpdate((event) => {
      if (width <= 0) return;
      split.value = Math.min(0.95, Math.max(0.05, start.value + event.translationX / width));
    });
  const cover = useAnimatedStyle(() => ({ left: split.value * width }));
  const inner = useAnimatedStyle(() => ({ left: -split.value * width }));
  const handle = useAnimatedStyle(() => ({ left: split.value * width }));
  return (
    <GestureDetector gesture={drag}>
      <View
        accessible
        accessibilityLabel={`${before}. ${after}`}
        accessibilityHint={hint}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        style={styles.compare}
        testID="camera-after-compare"
      >
        <Image source={{ uri: beforeUri }} resizeMode="cover" style={StyleSheet.absoluteFill} />
        <Animated.View style={[styles.cover, cover]}>
          <Animated.View style={[styles.coverInner, { width }, inner]}>
            <Image source={{ uri: afterUri }} resizeMode="cover" style={StyleSheet.absoluteFill} />
          </Animated.View>
        </Animated.View>
        <Animated.View style={[styles.handle, handle]} pointerEvents="none">
          <View style={styles.knob} />
        </Animated.View>
        <View style={[styles.label, styles.labelLeft]} pointerEvents="none">
          <SessionText face="chip" color={WHITE}>
            {before}
          </SessionText>
        </View>
        <View style={[styles.label, styles.labelRight]} pointerEvents="none">
          <SessionText face="chip" color={WHITE}>
            {after}
          </SessionText>
        </View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  compare: {
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 220,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  cover: { position: 'absolute', top: 0, bottom: 0, right: 0, overflow: 'hidden' },
  coverInner: { position: 'absolute', top: 0, bottom: 0 },
  handle: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 3,
    marginLeft: -1.5,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  knob: { width: 36, height: 36, borderRadius: 18, backgroundColor: WHITE },
  label: {
    position: 'absolute',
    top: spacing.sm,
    backgroundColor: SHADE,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  labelLeft: { left: spacing.sm },
  labelRight: { right: spacing.sm },
});
