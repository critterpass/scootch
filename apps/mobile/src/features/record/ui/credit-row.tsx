import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import type { WorkMode } from '@scootch/domain';
import { fonts } from '@scootch/tokens';

import { Scootch } from '../../../art/Scootch';
import { Chevron } from '../../../ui/icons';
import { useAppearance, useTextSizing } from '../../../screens/registry/support/forced-variant';
import { SPRING_CURVE } from '../../../ui/motion/motion-tokens';
import { useCharacterMotion, useMayMove } from '../../../ui/motion/use-feel';
import { useScreenStyle } from '../../../ui/use-screen-style';

/** The board's row: a 52 point picture, 10 from the words, on an 18 point corner that lights up. */
const LIT = { light: '#FBEDE7', dark: 'rgba(240,86,46,0.16)' } as const;
const THUMB = { light: '#F1ECE3', dark: '#27231F' } as const;
/** The three bars of the little meter, as tall as the board draws them at rest. */
const EQ_HEIGHTS = [10, 16, 7] as const;
const ALWAYS = ReduceMotion.Never;

function EqBar({ index, on, mayMove }: { index: number; on: boolean; mayMove: boolean }) {
  const { palette } = useScreenStyle();
  const level = useSharedValue(1);
  useEffect(() => {
    cancelAnimation(level);
    if (on && mayMove) {
      level.value = 0.3;
      level.value = withRepeat(
        withTiming(1, {
          duration: 220 + index * 70,
          easing: Easing.inOut(Easing.quad),
          reduceMotion: ALWAYS,
        }),
        -1,
        true,
      );
    } else {
      level.value = 1;
    }
    return () => cancelAnimation(level);
  }, [on, mayMove, index, level]);
  const bouncing = useAnimatedStyle(() => ({ transform: [{ scaleY: level.value }] }));
  return (
    <Animated.View
      style={[
        styles.eqBar,
        { height: EQ_HEIGHTS[index] ?? 10, backgroundColor: palette.tomato },
        bouncing,
      ]}
    />
  );
}

/** The little meter at the end of a row whose instrument is sounding. */
function Eq({ shown, on }: { shown: SharedValue<number>; on: boolean }) {
  const mayMove = useMayMove();
  const fading = useAnimatedStyle(() => ({ opacity: shown.value }));
  return (
    <Animated.View style={[styles.eq, fading]}>
      {EQ_HEIGHTS.map((_, index) => (
        <EqBar key={index} index={index} on={on} mayMove={mayMove} />
      ))}
    </Animated.View>
  );
}

export interface CreditRowProps {
  /** "Keys". */
  readonly title: string;
  /** "Mon · replied to Sam". */
  readonly detail: string;
  /** Read out for the whole row. */
  readonly label: string;
  /** The row's instrument is sounding now. */
  readonly lit?: boolean;
  /** A day still to come: drawn faint, with an empty picture. */
  readonly waiting?: boolean;
  /**
   * Scootch at the work the task was, when the row's task may be drawn; `undefined` leaves the
   * picture empty, as for a day whose task asked for care.
   */
  readonly work?: WorkMode | null;
  /** A tap on the row, with what it does for a screen reader. Unset, the row is only read. */
  readonly onPress?: () => void;
  readonly hint?: string;
  readonly testID: string;
}

/**
 * One line of the liner notes: Scootch at that day's work, the instrument, and the day and task
 * that earned it. While its instrument sounds the row lights up, grows to 1.02 and its meter
 * bounces, as the board's rows do under a playing record.
 */
export function CreditRow({
  title,
  detail,
  label,
  lit = false,
  waiting,
  work,
  onPress,
  hint,
  testID,
}: CreditRowProps) {
  const { palette } = useScreenStyle();
  const appearance = useAppearance();
  const { allowFontScaling, size } = useTextSizing();
  const mayMove = useMayMove();
  const character = useCharacterMotion();
  const on = useSharedValue(lit ? 1 : 0);
  useEffect(() => {
    on.value = withTiming(lit ? 1 : 0, {
      duration: mayMove ? 400 : 200,
      easing: SPRING_CURVE,
      reduceMotion: ALWAYS,
    });
  }, [lit, mayMove, on]);
  const lighting = useAnimatedStyle(() => ({
    transform: [{ scale: mayMove ? 1 + on.value * 0.02 : 1 }],
  }));
  const glow = useAnimatedStyle(() => ({ opacity: on.value }));
  return (
    <Animated.View style={[waiting ? styles.waiting : null, lighting]}>
      <Pressable
        accessible
        accessibilityRole={onPress ? 'button' : 'text'}
        accessibilityLabel={label}
        accessibilityHint={onPress ? hint : undefined}
        disabled={onPress === undefined}
        onPress={onPress}
        testID={testID}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        <Animated.View
          pointerEvents="none"
          style={[styles.light, { backgroundColor: LIT[appearance] }, glow]}
        />
        <View style={[styles.thumb, { backgroundColor: THUMB[appearance] }]}>
          {work === undefined ? null : (
            <Scootch
              mood={work ? 'working' : 'pleased'}
              workMode={work}
              size={52}
              {...character}
              {...(lit ? {} : { ownLoop: false })}
            />
          )}
        </View>
        <View style={styles.words}>
          <Text
            allowFontScaling={allowFontScaling}
            maxFontSizeMultiplier={1.8}
            style={[
              styles.title,
              { color: palette.ink, fontSize: size(15), lineHeight: size(15) * 1.2 },
            ]}
          >
            {title}
          </Text>
          <Text
            allowFontScaling={allowFontScaling}
            maxFontSizeMultiplier={1.8}
            style={[
              styles.detail,
              { color: palette.muted, fontSize: size(13), lineHeight: size(13) * 1.25 },
            ]}
          >
            {detail}
          </Text>
        </View>
        {waiting ? null : <Eq shown={on} on={lit} />}
        {onPress ? <Chevron color={palette.chevron} direction="right" /> : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
    paddingLeft: 4,
    paddingRight: 12,
    borderRadius: 18,
  },
  light: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: 18 },
  waiting: { opacity: 0.38 },
  pressed: { opacity: 0.6 },
  thumb: { width: 52, height: 52, borderRadius: 14, overflow: 'hidden' },
  words: { flex: 1, gap: 2, minWidth: 0 },
  title: { fontFamily: fonts.heading, fontWeight: '700' },
  detail: { fontFamily: fonts.body, fontWeight: '400' },
  eq: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 16 },
  eqBar: { width: 3, borderRadius: 2, transformOrigin: 'bottom' },
});
