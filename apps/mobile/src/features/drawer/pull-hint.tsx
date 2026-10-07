import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolateColor,
  ReduceMotion,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { fonts } from '@scootch/tokens';

import { useT } from '../../i18n/i18n-provider';
import { touchHaptic } from '../../ui/motion/press-spring';
import { useFeel } from '../../ui/motion/use-feel';
import { useScreenStyle } from '../../ui/use-screen-style';

const FRONT = { width: 76, height: 28, radius: 10 } as const;
const SLIPS = [
  { width: 50, rise: 9, lean: -5 },
  { width: 42, rise: 15, lean: 4 },
  { width: 30, rise: 20, lean: -2 },
] as const;
const CAPTION_SIZE = 13;
/** The hint is not drawn at all for the first few points of a pull: a scroll's own bounce. */
const SHOWS_AFTER = 14;
const POP = { damping: 11, stiffness: 320, mass: 0.6, reduceMotion: ReduceMotion.Never } as const;

export interface PullHintProps {
  /** How far the screen is pulled down past its top, in points. */
  readonly pull: SharedValue<number>;
  /** The pull at which letting go opens the drawer. */
  readonly opensAt: number;
}

/**
 * What a pull on the one screen shows in the room it opens at the top: a small drawer front that
 * slides out as the screen comes down, with the parked slips of paper rising out of it. At the
 * distance that opens the drawer it pops, turns tomato and says to let go, with one tick under
 * the thumb. It is drawn from the pull alone, on the UI thread, and takes no touch. Where nothing
 * may move it only fades in and changes its words.
 */
export function PullHint({ pull, opensAt }: PullHintProps) {
  const { palette, allowFontScaling, size } = useScreenStyle();
  const { mayMove, haptics } = useFeel();
  const t = useT();

  const ready = useDerivedValue<number>(() => (pull.value >= opensAt ? 1 : 0));
  const pop = useDerivedValue<number>(() => withSpring(ready.value, POP));
  const tick = () => touchHaptic('primary');
  useAnimatedReaction(
    () => ready.value,
    (now, before) => {
      if (haptics && now === 1 && before === 0) scheduleOnRN(tick);
    },
  );

  const { ink, tomato } = palette;
  const place = useAnimatedStyle(() => {
    const along = Math.min(1, pull.value / opensAt);
    const opacity = Math.min(1, Math.max(0, (pull.value - SHOWS_AFTER) / 26));
    if (!mayMove) return { opacity, transform: [{ translateY: 10 }, { scale: 1 }] };
    return {
      opacity,
      // It stays in the middle of the room the pull has opened, and grows into it.
      transform: [
        { translateY: Math.max(2, pull.value / 2 - 40) },
        { scale: 0.72 + 0.28 * along + 0.1 * pop.value },
      ],
    };
  }, [mayMove, opensAt]);
  const front = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(pop.value, [0, 1], [`${ink}26`, tomato]),
  }));
  const knob = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(pop.value, [0, 1], [`${ink}8C`, palette.onTomato]),
  }));
  const asking = useAnimatedStyle(() => ({ opacity: 1 - pop.value }));
  const letGo = useAnimatedStyle(() => ({ opacity: pop.value }));

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID="pull-hint"
      style={[styles.place, place]}
    >
      <View style={styles.drawer}>
        {SLIPS.map((slip, index) => (
          <Slip key={index} slip={slip} pull={pull} opensAt={opensAt} pop={pop} still={!mayMove} />
        ))}
        <Animated.View style={[styles.front, front]}>
          <Animated.View style={[styles.knob, knob]} />
        </Animated.View>
      </View>
      <View style={styles.captions}>
        <Animated.View style={asking}>
          <Text
            allowFontScaling={allowFontScaling}
            style={[styles.caption, { color: palette.muted, fontSize: size(CAPTION_SIZE) }]}
          >
            {t('drawer.pull')}
          </Text>
        </Animated.View>
        <Animated.View style={[styles.over, letGo]}>
          <Text
            allowFontScaling={allowFontScaling}
            style={[styles.caption, { color: palette.tomato, fontSize: size(CAPTION_SIZE) }]}
          >
            {t('drawer.pull.ready')}
          </Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

interface SlipProps {
  readonly slip: (typeof SLIPS)[number];
  readonly pull: SharedValue<number>;
  readonly opensAt: number;
  readonly pop: Readonly<Pick<SharedValue<number>, 'value'>>;
  readonly still: boolean;
}

/** One parked slip of paper, rising out of the drawer as the pull goes on. */
function Slip({ slip, pull, opensAt, pop, still }: SlipProps) {
  const { palette } = useScreenStyle();
  const rising = useAnimatedStyle(() => {
    if (still) return { transform: [{ translateY: -slip.rise }, { rotate: '0deg' }] };
    const along = Math.min(1, Math.max(0, (pull.value - SHOWS_AFTER) / (opensAt - SHOWS_AFTER)));
    return {
      transform: [
        { translateY: -slip.rise * along - 5 * pop.value },
        { rotate: `${slip.lean * along}deg` },
      ],
    };
  }, [still, opensAt]);
  return (
    <Animated.View
      style={[
        styles.slip,
        { width: slip.width, backgroundColor: palette.surface, borderColor: `${palette.ink}26` },
        rising,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  place: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 6,
  },
  drawer: {
    width: FRONT.width,
    height: FRONT.height + 22,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  slip: {
    position: 'absolute',
    bottom: FRONT.height - 14,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
  },
  front: {
    width: FRONT.width,
    height: FRONT.height,
    borderRadius: FRONT.radius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  knob: { width: 18, height: 5, borderRadius: 3 },
  captions: { alignItems: 'center' },
  over: { position: 'absolute', top: 0 },
  caption: { fontFamily: fonts.body, fontWeight: '600' },
});
