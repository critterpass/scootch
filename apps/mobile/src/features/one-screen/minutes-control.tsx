import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { fonts } from '@scootch/tokens';

import { useT } from '../../i18n/i18n-provider';
import { useAppearance } from '../../screens/registry/support/forced-variant';
import { PressSpring, touchHaptic } from '../../ui/motion/press-spring';
import { useFeel } from '../../ui/motion/use-feel';
import { useScreenStyle } from '../../ui/use-screen-style';

/** The room each length has on the wheel, and the wheel's own height. */
const STEP = 64;
const HEIGHT = 64;
const LENS = { width: 78, height: 54 } as const;
const NUMBER_SIZE = 21;
const UNIT_SIZE = 11;
/** The track and the lens in each scheme, as the segmented control before it drew them. */
const TRACK = { light: 'rgba(118, 112, 104, 0.13)', dark: 'rgba(118, 112, 104, 0.26)' } as const;
const PILL = { light: '#FFFFFF', dark: '#5E5852' } as const;

export interface MinutesControlProps {
  readonly minutes: number;
  readonly options: readonly number[];
  readonly onMinutes: (minutes: number) => void;
}

/**
 * How long to go for: a wheel of lengths that is turned with a thumb. The lengths ride under a
 * lens in the middle; the one in the lens is the length, and it grows and darkens as it arrives
 * while the others fall away to either side. The wheel is the system's own scrolling, so it
 * coasts and settles as everything on the phone does, snapping to a length; each length that
 * passes the lens is one tick under the thumb, and coming to rest is a soft tap. A tap on any
 * length turns the wheel to it. All of it moves on the UI thread.
 */
export function MinutesControl({ minutes, options, onMinutes }: MinutesControlProps) {
  const { palette, allowFontScaling, size } = useScreenStyle();
  const { mayMove, haptics } = useFeel();
  const appearance = useAppearance();
  const t = useT();
  const [width, setWidth] = useState(0);
  const count = options.length;
  const index = Math.max(0, options.indexOf(minutes));

  const wheel = useAnimatedRef<Animated.ScrollView>();
  /** How far the wheel is turned, in points. */
  const turned = useSharedValue(index * STEP);
  const latest = useRef({ options, minutes, onMinutes, haptics });
  latest.current = { options, minutes, onMinutes, haptics };

  // The length under the lens changed: it is the length now, and it is felt.
  const arrive = useCallback((at: number) => {
    const now = latest.current;
    const next = now.options[at];
    if (next === undefined || next === now.minutes) return;
    if (now.haptics) touchHaptic('choice');
    now.onMinutes(next);
  }, []);
  const rest = useCallback(() => {
    if (latest.current.haptics) touchHaptic('primary');
  }, []);
  const follow = useAnimatedScrollHandler({
    onScroll: (event) => {
      turned.value = event.contentOffset.x;
    },
    onMomentumEnd: () => {
      scheduleOnRN(rest);
    },
  });
  useAnimatedReaction(
    () => Math.min(count - 1, Math.max(0, Math.round(turned.value / STEP))),
    (at, before) => {
      if (before !== null && at !== before) scheduleOnRN(arrive, at);
    },
    [count],
  );
  // A length set from somewhere else turns the wheel to it.
  useEffect(() => {
    if (Math.round(turned.value / STEP) !== index) {
      wheel.current?.scrollTo({ x: index * STEP, animated: mayMove });
    }
  }, [index, mayMove, turned, wheel]);

  const side = Math.max(0, (width - STEP) / 2);
  return (
    <View
      accessibilityRole="radiogroup"
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      testID="task-set-minutes"
      style={[styles.track, { backgroundColor: TRACK[appearance] }]}
    >
      <View pointerEvents="none" style={styles.lensPlace}>
        <View style={[styles.lens, { backgroundColor: PILL[appearance] }]}>
          <Text
            allowFontScaling={allowFontScaling}
            style={[styles.unit, { color: palette.muted, fontSize: size(UNIT_SIZE) }]}
          >
            {t('taskSet.minutes.unit')}
          </Text>
        </View>
      </View>
      {width === 0 ? null : (
        <Animated.ScrollView
          ref={wheel}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={STEP}
          decelerationRate="fast"
          contentOffset={{ x: index * STEP, y: 0 }}
          contentContainerStyle={{ paddingHorizontal: side }}
          scrollEventThrottle={16}
          onScroll={follow}
        >
          {options.map((option, at) => (
            <Length
              key={option}
              at={at}
              turned={turned}
              still={!mayMove}
              label={String(option)}
              spoken={t('taskSet.minutes', { minutes: option })}
              hint={t('taskSet.minutes.hint')}
              chosen={option === minutes}
              color={palette.ink}
              fontSize={size(NUMBER_SIZE)}
              allowFontScaling={allowFontScaling}
              testID={`task-set-minutes-${option}`}
              onPress={() => wheel.current?.scrollTo({ x: at * STEP, animated: true })}
            />
          ))}
        </Animated.ScrollView>
      )}
    </View>
  );
}

interface LengthProps {
  readonly at: number;
  readonly turned: SharedValue<number>;
  readonly still: boolean;
  readonly label: string;
  readonly spoken: string;
  readonly hint: string;
  readonly chosen: boolean;
  readonly color: string;
  readonly fontSize: number;
  readonly allowFontScaling: boolean;
  readonly testID: string;
  readonly onPress: () => void;
}

/** One length on the wheel: full size and full ink under the lens, smaller and fainter away from it. */
function Length(props: LengthProps) {
  const { at, turned, still } = props;
  const riding = useAnimatedStyle(() => {
    const away = Math.abs(turned.value - at * STEP) / STEP;
    return {
      opacity: interpolate(away, [0, 1, 2.6], [1, 0.5, 0.18], 'clamp'),
      transform: [
        { scale: still ? 1 : interpolate(away, [0, 1, 2.6], [1.22, 0.9, 0.76], 'clamp') },
        { translateY: still ? -7 : interpolate(away, [0, 1], [-7, -2], 'clamp') },
      ],
    };
  }, [at, still]);
  return (
    <PressSpring
      accessibilityRole="radio"
      accessibilityState={{ selected: props.chosen, checked: props.chosen }}
      accessibilityLabel={props.spoken}
      accessibilityHint={props.hint}
      onPress={props.onPress}
      testID={props.testID}
      style={styles.length}
    >
      <Animated.View style={riding}>
        <Text
          allowFontScaling={props.allowFontScaling}
          style={[styles.number, { color: props.color, fontSize: props.fontSize }]}
        >
          {props.label}
        </Text>
      </Animated.View>
    </PressSpring>
  );
}

const styles = StyleSheet.create({
  track: {
    height: HEIGHT,
    borderRadius: HEIGHT / 2,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  lensPlace: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lens: {
    width: LENS.width,
    height: LENS.height,
    borderRadius: LENS.height / 2,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 6,
    boxShadow: '0 3px 10px rgba(0, 0, 0, 0.10), 0 0 0 0.5px rgba(0, 0, 0, 0.05)',
  },
  unit: {
    fontFamily: fonts.body,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  length: {
    width: STEP,
    height: HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: {
    fontFamily: fonts.heading,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
