import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { fonts } from '@scootch/tokens';

import { useT } from '../../i18n/i18n-provider';
import { CONTROL_HEIGHT } from '../../ui/buttons';
import { WaveIcon } from '../../ui/icons';
import { CROSSFADE_MS, SPRING_CURVE } from '../../ui/motion/motion-tokens';
import { useScreenStyle } from '../../ui/use-screen-style';

import { capsuleEdge, liveRowShift } from './composer-fold';
import { useFollow } from './use-follow';
import { Waveform } from './waveform';

const LABEL_SIZE = 17;
const CANCEL_SIZE = 16;
const TIME_SIZE = 15;
/** The capsule's colour once the cancel is armed, and the ink it carries. */
const ARMED = '#5A5550';
const ON_ARMED = '#FFFFFF';
const RADIUS = CONTROL_HEIGHT / 2;
const FILL = { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 } as const;

export interface ComposerCapsuleProps {
  readonly listening: boolean;
  readonly armed: boolean;
  readonly startedAt: number | null;
  /** The voice's level, from 0 to 1. */
  readonly level: number;
  /**
   * The width the capsule gives up at rest: the round button and its gap. The capsule is laid out
   * once, over the whole dock, and only its drawn edge moves.
   */
  readonly slot: number;
  /** How far the finger has slid since it went down; left is negative. */
  readonly drag: SharedValue<number>;
  /** The dock is a text field: the capsule has faded out under it. */
  readonly hidden?: boolean;
  /** The hold was too short to be a recording: the capsule shakes its head. */
  readonly tooShort?: boolean;
}

/**
 * The talk capsule, drawn over the dock's whole inner width. At rest its left edge stands clear of
 * the round button; held, the edge sweeps to the dock's edge while the capsule turns tomato, the
 * label gives way to the live waveform and the time, and an armed cancel turns it grey. Nothing
 * here changes layout: the edge, the layers and the colour are transforms and opacity on the UI
 * thread, so a redraw of the waveform cannot move the capsule.
 */
export function ComposerCapsule({
  listening,
  armed,
  startedAt,
  level,
  slot,
  drag,
  hidden = false,
  tooShort = false,
}: ComposerCapsuleProps) {
  const { palette, allowFontScaling, size, reducedMotion } = useScreenStyle();
  const t = useT();
  const held = listening ? 1 : 0;
  const isArmed = listening && armed ? 1 : 0;

  // One follower per property, each with the board's own time. Where nothing may move the edge
  // jumps and the layers crossfade.
  const fold = useFollow(held, reducedMotion ? 0 : 500, SPRING_CURVE);
  const pose = useFollow(held, reducedMotion ? 0 : 450, SPRING_CURVE);
  const layer = useFollow(held, reducedMotion ? CROSSFADE_MS : 250);
  const tone = useFollow(held, reducedMotion ? CROSSFADE_MS : 350);
  const armedTone = useFollow(isArmed, reducedMotion ? CROSSFADE_MS : 350);
  const armedLayer = useFollow(isArmed, reducedMotion ? CROSSFADE_MS : 250);
  const armedLabel = useFollow(isArmed, 200);
  const width = useSharedValue(0);
  const present = useFollow(hidden ? 0 : 1, reducedMotion ? CROSSFADE_MS : 300);
  const stands = useFollow(hidden ? 0 : 1, reducedMotion ? 0 : 450, SPRING_CURVE);
  const shake = useSharedValue(0);
  useEffect(() => {
    if (!tooShort || reducedMotion) return;
    const step = {
      duration: 95,
      easing: Easing.out(Easing.quad),
      reduceMotion: ReduceMotion.Never,
    };
    shake.value = withSequence(
      withTiming(-6, step),
      withTiming(5, step),
      withTiming(-3, step),
      withTiming(0, step),
    );
  }, [reducedMotion, shake, tooShort]);
  const overStyle = useAnimatedStyle(() => ({
    opacity: present.value,
    transform: [{ translateX: shake.value }, { scale: 0.94 + 0.06 * stands.value }],
  }));
  // The held capsule glows tomato underneath instead of casting ink.
  const glowStyle = useAnimatedStyle(() => {
    const edge = capsuleEdge(fold.value, slot);
    const full = width.value;
    return {
      opacity: full > 0 ? tone.value * (1 - armedTone.value) : 0,
      transform: [{ translateX: edge / 2 }, { scaleX: full > 0 ? (full - edge) / full : 1 }],
    };
  });

  const { ink, tomato } = palette;
  const bodyStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      armedTone.value,
      [0, 1],
      [interpolateColor(tone.value, [0, 1], [ink, tomato]), ARMED],
    ),
    transform: [{ translateX: capsuleEdge(fold.value, slot) }],
  }));
  // Undoes the body's shift, so what is inside stays where the dock is and the body's edge wipes
  // across it.
  const insideStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -capsuleEdge(fold.value, slot) }],
  }));
  const shadowStyle = useAnimatedStyle(() => {
    const edge = capsuleEdge(fold.value, slot);
    const full = width.value;
    return {
      opacity: full > 0 ? 1 - tone.value * (1 - armedTone.value) : 0,
      transform: [{ translateX: edge / 2 }, { scaleX: full > 0 ? (full - edge) / full : 1 }],
    };
  });
  const labelStyle = useAnimatedStyle(() => ({
    opacity: 1 - layer.value,
    transform: [{ translateX: capsuleEdge(fold.value, slot) / 2 }, { scale: 1 - 0.1 * pose.value }],
  }));
  const liveStyle = useAnimatedStyle(() => ({
    opacity: layer.value * (1 - armedLayer.value),
    transform: [
      { translateX: reducedMotion ? 0 : liveRowShift(drag.value) },
      { scale: 0.94 + 0.06 * pose.value },
    ],
  }));
  const cancelStyle = useAnimatedStyle(() => ({ opacity: armedLabel.value }));

  return (
    <Animated.View
      pointerEvents="none"
      onLayout={(event) => {
        width.value = event.nativeEvent.layout.width;
      }}
      style={[styles.over, { left: -slot }, overStyle]}
    >
      <Animated.View style={[styles.shadow, shadowStyle]} />
      <Animated.View style={[styles.shadow, styles.glow, glowStyle]} />
      <View style={styles.clip}>
        <Animated.View style={[styles.body, bodyStyle]}>
          <Animated.View style={[styles.fill, insideStyle]}>
            <Animated.View style={[styles.layer, { paddingHorizontal: slot / 2 }, labelStyle]}>
              <WaveIcon color={palette.page} />
              <Text
                allowFontScaling={allowFontScaling}
                numberOfLines={1}
                adjustsFontSizeToFit
                style={[styles.label, { color: palette.page, fontSize: size(LABEL_SIZE) }]}
              >
                {t('talk.hold')}
              </Text>
            </Animated.View>
            <Animated.View style={[styles.fill, liveStyle]}>
              {startedAt === null ? null : (
                <Waveform
                  level={level}
                  startedAt={startedAt}
                  moving={!reducedMotion}
                  flat={armed}
                  color={palette.onTomato}
                  allowFontScaling={allowFontScaling}
                  fontSize={size(TIME_SIZE)}
                />
              )}
            </Animated.View>
            <Animated.View style={[styles.layer, cancelStyle]}>
              <Text
                allowFontScaling={allowFontScaling}
                numberOfLines={1}
                adjustsFontSizeToFit
                style={[styles.label, { color: ON_ARMED, fontSize: size(CANCEL_SIZE) }]}
              >
                {t('composer.releaseToCancel')}
              </Text>
            </Animated.View>
          </Animated.View>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: FILL,
  over: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
  },
  shadow: {
    ...FILL,
    borderRadius: RADIUS,
    boxShadow: '0 6px 16px -4px rgba(28, 26, 23, 0.35)',
  },
  glow: {
    boxShadow: '0 6px 16px -4px rgba(240, 86, 46, 0.5)',
  },
  clip: {
    ...FILL,
    borderRadius: RADIUS,
    overflow: 'hidden',
  },
  body: {
    ...FILL,
    borderRadius: RADIUS,
    overflow: 'hidden',
    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.2)',
  },
  layer: {
    ...FILL,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 11,
  },
  label: {
    fontFamily: fonts.body,
    fontWeight: '600',
    letterSpacing: -0.17,
    textAlign: 'center',
    flexShrink: 1,
  },
});
