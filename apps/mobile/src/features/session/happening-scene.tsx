import { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { buildProp, LOOPS, type PhuMood, type PropName } from '@phusclass/art/class';
import type { Happening } from '@phusclass/domain/board';
import type { Moment } from '@phusclass/voice/class';

import { FigureCanvas } from '../../classroom/figure-canvas';
import { useHandFont } from '../../classroom/use-hand-font';
import { useMayMove } from '../../ui/motion/use-feel';

/** How long a happening stays in the room. */
export const HAPPENING_MS = 8500;

/** What each happening brings, and how he takes it. */
export const HAPPENINGS: Record<
  Happening,
  {
    readonly moment: Moment;
    readonly mood: PhuMood;
    readonly prop: PropName | null;
    readonly path: 'walk' | 'fly' | 'stay' | 'peek';
  }
> = {
  'cat on the desk': { moment: 'happeningCat', mood: 'laugh', prop: 'cat', path: 'walk' },
  'paper plane': { moment: 'happeningPaperPlane', mood: 'surprised', prop: 'plane', path: 'fly' },
  'power cut': { moment: 'happeningPowerCut', mood: 'calm', prop: 'candle', path: 'stay' },
  'sao do at the door': { moment: 'happeningSaoDo', mood: 'watch', prop: 'armband', path: 'peek' },
  'principal at the window': {
    moment: 'happeningPrincipal',
    mood: 'peer',
    prop: null,
    path: 'stay',
  },
  'ice-cream bell': { moment: 'happeningIceCream', mood: 'think', prop: 'icecream', path: 'peek' },
  'pop quiz': { moment: 'happeningPopQuiz', mood: 'name', prop: null, path: 'stay' },
};

const ALL_LOOPS = new Set(Object.keys(LOOPS));

/**
 * One happening, played over the room the way its board plays it: the cat walks along the front,
 * a paper plane drifts in, the power cuts to a candle, the monitor's armband peeks round the door.
 * It is never explained. Under Reduce Motion the prop simply appears and goes.
 */
export function HappeningScene({ happening }: { readonly happening: Happening }) {
  const { width, height } = useWindowDimensions();
  const mayMove = useMayMove();
  const hand = useHandFont();
  const { prop, path } = HAPPENINGS[happening];
  const figure = useMemo(() => (prop === null ? null : buildProp(prop)), [prop]);

  const clock = useSharedValue(0);
  const frames = useFrameCallback((frame) => clock.set(frame.timeSinceFirstFrame), false);
  useEffect(() => {
    frames.setActive(mayMove);
    return () => frames.setActive(false);
  }, [frames, mayMove]);

  const travel = useSharedValue(mayMove ? 0 : 0.5);
  useEffect(() => {
    if (!mayMove) return;
    travel.set(
      withTiming(1, {
        duration: path === 'fly' ? 3400 : HAPPENING_MS,
        easing: path === 'fly' ? Easing.bezier(0.3, 0.1, 0.4, 1) : Easing.linear,
      }),
    );
  }, [travel, mayMove, path]);

  const size = path === 'walk' ? 110 : path === 'fly' ? 70 : 60;
  const base = { x: width * 0.6, y: height * 0.32 };
  const moving = useAnimatedStyle(() => {
    const p = travel.get();
    if (path === 'walk') return { transform: [{ translateX: -size + (width + size) * p }] };
    if (path === 'fly') {
      return {
        transform: [
          { translateX: 20 + (width * 0.7 - 20) * p },
          { translateY: 60 + height * 0.25 * p },
          { rotate: `${18 * Math.sin(p * Math.PI)}deg` },
        ],
      };
    }
    if (path === 'peek') {
      const out = p < 0.15 ? p / 0.15 : p > 0.85 ? (1 - p) / 0.15 : 1;
      return { transform: [{ translateX: -size + size * 1.4 * out }] };
    }
    return {};
  });

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(300)}
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      accessibilityElementsHidden
      testID={`happening-${happening.replaceAll(' ', '-')}`}
    >
      {happening === 'power cut' ? <View style={[StyleSheet.absoluteFill, styles.dark]} /> : null}
      {figure !== null ? (
        <Animated.View
          style={[
            styles.prop,
            path === 'walk'
              ? { top: height * 0.4, left: 0 }
              : path === 'fly'
                ? { top: 0, left: 0 }
                : path === 'peek'
                  ? { top: height * 0.22, left: 0 }
                  : { top: base.y, left: base.x - size / 2 },
            moving,
          ]}
        >
          <FigureCanvas
            figure={figure}
            width={size}
            clock={clock}
            running={ALL_LOOPS}
            hand={hand}
          />
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  dark: { backgroundColor: 'rgba(14,18,34,0.55)' },
  prop: { position: 'absolute' },
});
