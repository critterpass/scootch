import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { buildMaterial, CARD_MATERIALS } from '@scootch/art';
import { fonts } from '@scootch/tokens';

import { STAMP as LANDING } from '../../../ui/motion/motion-tokens';
import { useScreenStyle } from '../../../ui/use-screen-style';
import { STAMPED } from '../../plus/ui/member-card';
import { CommandCanvas } from '../../reveal/ui/command-canvas';

/** The board's stamp: a 116 point disc of holo foil, turned twelve degrees. */
const DISC = 116;
const REST_TURN = -12;
const SPACE = { width: DISC, height: DISC };
const INK = '#1C1A17';

export interface MonthStampProps {
  /** "September". */
  readonly month: string;
  /** "Complete". */
  readonly word: string;
  /** "9 caught". */
  readonly count: string;
  /** Changes when another page is shown, so the stamp lands again on it. */
  readonly landsOn: string;
}

/**
 * The foil stamp a full month gets: it thumps down on the page's corner when the page is shown,
 * squashes as it lands and settles. Where nothing may move it is simply there.
 */
export function MonthStamp({ month, word, count, landsOn }: MonthStampProps) {
  const { reducedMotion } = useScreenStyle();
  const foil = useMemo(
    () => buildMaterial({ x: 0, y: 0, w: DISC, h: DISC }, DISC / 2, CARD_MATERIALS.holo),
    [],
  );
  const size = useSharedValue(1);
  const turn = useSharedValue(REST_TURN);
  const shown = useSharedValue(1);
  useEffect(() => {
    if (reducedMotion) return;
    const out = Easing.out(Easing.quad);
    shown.value = 0;
    shown.value = withTiming(1, { duration: LANDING.landMs * 0.5 });
    size.value = LANDING.fromScale;
    size.value = withSequence(
      withTiming(LANDING.landScale, { duration: LANDING.landMs, easing: out }),
      withTiming(LANDING.bounceScale, { duration: LANDING.bounceMs, easing: out }),
      withTiming(1, { duration: LANDING.settleMs, easing: out }),
    );
    turn.value = REST_TURN + LANDING.fromTurnDeg;
    turn.value = withSequence(
      withTiming(REST_TURN + LANDING.landTurnDeg, { duration: LANDING.landMs, easing: out }),
      withTiming(REST_TURN, { duration: LANDING.bounceMs + LANDING.settleMs, easing: out }),
    );
  }, [landsOn, reducedMotion, size, turn, shown]);
  const landed = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ rotate: `${turn.value}deg` }, { scale: size.value }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${month}, ${word}, ${count}`}
      testID="binder-stamp"
      style={[styles.stamp, landed]}
    >
      <View style={styles.disc}>
        <CommandCanvas commands={foil} space={SPACE} width={DISC} />
      </View>
      <View style={styles.ring} />
      <View style={styles.words}>
        <Text allowFontScaling={false} numberOfLines={1} style={styles.small}>
          {month.toLocaleUpperCase()}
        </Text>
        <Text allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit style={styles.word}>
          {word.toLocaleUpperCase()}
        </Text>
        <Text allowFontScaling={false} numberOfLines={1} style={styles.small}>
          {count.toLocaleUpperCase()}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stamp: {
    position: 'absolute',
    right: -8,
    bottom: 56,
    width: DISC,
    height: DISC,
    borderRadius: DISC / 2,
    boxShadow: '0 10px 24px -8px rgba(80,40,120,0.55)',
  },
  disc: { width: DISC, height: DISC, borderRadius: DISC / 2, overflow: 'hidden' },
  ring: {
    position: 'absolute',
    top: 8,
    right: 8,
    bottom: 8,
    left: 8,
    borderRadius: DISC / 2,
    borderWidth: 1.5,
    borderColor: 'rgba(28,26,23,0.4)',
  },
  words: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 14,
  },
  small: { color: INK, fontFamily: STAMPED, fontWeight: '700', fontSize: 7, letterSpacing: 1.12 },
  word: { color: INK, fontFamily: fonts.heading, fontWeight: '900', fontSize: 17 },
});
