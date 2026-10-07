import { Canvas } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import type { DrawCommand } from '@scootch/art';
import type { Attitude } from '@scootch/domain';
import { fonts, spacing } from '@scootch/tokens';

import { Scootch } from '../../art/Scootch';
import { CommandLayer } from '../../art/skia-commands';
import { useT } from '../../i18n/i18n-provider';
import { CapsuleButton } from '../../ui/buttons';
import { useCharacterMotion } from '../../ui/motion/use-feel';
import { SafeFrame } from '../../ui/safe-frame';
import { useScreenStyle } from '../../ui/use-screen-style';
import { SessionText } from '../session/ui/session-text';

import { MemberCard, memberNumber, STAMPED } from './ui/member-card';
import { Panel } from './ui/parts';

export interface WelcomeProps {
  readonly attitude: Attitude;
  /** Scootch's line for the moment, from the line pack; `null` on a day with something heavy in it. */
  readonly said: string | null;
  /** The plan and what it does next, with the store's own dates, said once. */
  readonly print: string;
  /** The member's number once the server has given it. */
  readonly number: number | null;
  readonly year: string;
  /** True for a lifetime purchase once the world draws its lighthouse. */
  readonly landmark: boolean;
  readonly pickFinish: () => void;
  readonly done: () => void;
}

/** The sleeve and the card, as the board sizes them on a 393 point phone. */
const SLEEVE = { width: 301, height: 148, back: 210, radius: 22 } as const;
const CARD_WIDTH = 269;
const RISE = { from: 150, over: -14, ms: 1300 } as const;
const SLEEVE_PAPER = '#E5D9C6';
const SLEEVE_BACK = '#D9CBB6';
const SLEEVE_INK = '#6F5E48';
const SLEEVE_MUTED = '#8A7A63';

/** The few bits of paper in the air around the card: where each hangs, and what it is. */
const BITS = [
  { left: 0.13, top: 20, width: 10, height: 16, round: 2, color: '#F0562E', turn: -20 },
  { left: 0.81, top: 50, width: 14, height: 8, round: 2, color: '#7FB7FF', turn: 30 },
  { left: 0.2, top: 200, width: 9, height: 9, round: 5, color: '#FFD66B', turn: 0 },
  { left: 0.76, top: 230, width: 8, height: 14, round: 2, color: '#1C1A17', turn: 16 },
  { left: 0.84, top: -10, width: 10, height: 10, round: 5, color: '#F49AC1', turn: 0 },
] as const;

function Bit({ bit, index, still }: { bit: (typeof BITS)[number]; index: number; still: boolean }) {
  const at = useSharedValue(0);
  useEffect(() => {
    if (still) return;
    at.value = withRepeat(
      withTiming(1, { duration: 2200 + index * 300, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [still, index, at]);
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: -14 * at.value },
      { rotate: `${bit.turn + (index % 2 ? 40 : -40) * at.value}deg` },
    ],
  }));
  return (
    <Animated.View
      style={[
        styles.bit,
        {
          left: `${bit.left * 100}%`,
          top: bit.top,
          width: bit.width,
          height: bit.height,
          borderRadius: bit.round,
          backgroundColor: bit.color,
        },
        style,
      ]}
    />
  );
}

/**
 * The welcome, after any purchase of Plus: the member card slides out of its paper sleeve with
 * Scootch on top of it, and the plan's dates are stated once, plainly, under the celebration. It
 * sells nothing: "Pick my first finish" opens the studio, where a member wears every finish.
 */
export function Welcome(props: WelcomeProps) {
  const t = useT();
  const { palette, reducedMotion, largeText, allowFontScaling, size } = useScreenStyle();
  const character = useCharacterMotion();
  const { width } = useWindowDimensions();
  const quiet = character.care !== 'none';
  const rise = useSharedValue(reducedMotion ? 0 : RISE.from);
  useEffect(() => {
    if (reducedMotion) {
      rise.value = 0;
      return;
    }
    rise.value = withDelay(
      350,
      withSequence(
        withTiming(RISE.over, { duration: RISE.ms, easing: Easing.bezier(0.32, 0.72, 0, 1) }),
        withTiming(0, { duration: 420, easing: Easing.out(Easing.ease) }),
      ),
    );
  }, [reducedMotion, rise]);
  const rising = useAnimatedStyle(() => ({ transform: [{ translateY: rise.value }] }));
  const glow = useMemo(
    (): DrawCommand[] => [
      {
        op: 'paint',
        path: [['O', width / 2, 220, 260]],
        paint: {
          kind: 'radial',
          centre: [width / 2, 220],
          radius: 260,
          stops: [
            [0, palette.tomato, 0.28],
            [0.62, palette.tomato, 0],
          ],
        },
        alpha: 1,
        blend: 'normal',
      },
    ],
    [width, palette.tomato],
  );
  const scale = largeText ? 0.7 : Math.min(1, (width - spacing.lg * 2) / SLEEVE.width);
  return (
    <SafeFrame testID="plus-welcome" style={[styles.page, { backgroundColor: palette.page }]}>
      <ScrollView contentContainerStyle={styles.middle} showsVerticalScrollIndicator={false}>
        <View style={[styles.stage, { height: 430 * scale }]}>
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Canvas style={StyleSheet.absoluteFill}>
              <CommandLayer commands={glow} />
            </Canvas>
          </View>
          {quiet
            ? null
            : BITS.map((bit, index) => (
                <Bit key={index} bit={bit} index={index} still={reducedMotion} />
              ))}
          <View
            style={[styles.pocket, { width: SLEEVE.width, height: 410, transform: [{ scale }] }]}
          >
            <View
              style={[
                styles.back,
                { height: SLEEVE.back, borderRadius: SLEEVE.radius, backgroundColor: SLEEVE_BACK },
              ]}
            />
            <View style={styles.window}>
              <Animated.View style={[styles.riser, rising]}>
                <View style={styles.scootch}>
                  <Scootch mood="celebrating" attitude={props.attitude} size={150} {...character} />
                </View>
                <MemberCard
                  finish="holo"
                  width={CARD_WIDTH}
                  number={props.number}
                  year={props.year}
                  line={null}
                  mood="pleased"
                  scootch={false}
                  testID="plus-welcome-card"
                />
              </Animated.View>
            </View>
            <View style={[styles.front, { height: SLEEVE.height, backgroundColor: SLEEVE_PAPER }]}>
              <Text allowFontScaling={false} style={styles.sleeveNumber}>
                {props.number === null
                  ? `${t('brand.name')} ${t('brand.plus')}`.toLocaleUpperCase()
                  : t('plus.welcome.member', { number: memberNumber(props.number) })}
              </Text>
              <Text allowFontScaling={false} style={styles.sleeveWords}>
                {t('plus.welcome.sleeve')}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.words}>
          <Text
            allowFontScaling={allowFontScaling}
            maxFontSizeMultiplier={1.4}
            accessibilityRole="header"
            style={[styles.title, { color: palette.ink, fontSize: size(44) }]}
          >
            {t('plus.welcome.title')}
          </Text>
          {props.said === null ? null : (
            <SessionText
              face="body"
              color={palette.ink}
              style={styles.centred}
              testID="plus-welcome-line"
            >
              {props.said}
            </SessionText>
          )}
          <SessionText
            face="caption"
            color={palette.muted}
            style={styles.centred}
            testID="plus-welcome-print"
          >
            {props.print}
          </SessionText>
          {props.landmark ? (
            <Panel testID="plus-welcome-landmark">
              <SessionText face="action" color={palette.ink}>
                {t('plus.lifetime.landmark')}
              </SessionText>
              <SessionText face="caption" color={palette.muted}>
                {t('plus.lifetime.landmark.note')}
              </SessionText>
            </Panel>
          ) : null}
        </View>
      </ScrollView>
      <View style={styles.foot}>
        <CapsuleButton
          label={t('plus.welcome.pick')}
          hint={t('plus.welcome.pick.hint')}
          onPress={props.pickFinish}
          testID="plus-welcome-pick"
        />
        <CapsuleButton
          label={t('plus.welcome.done')}
          hint={t('plus.done.hint')}
          tone="quiet"
          onPress={props.done}
          testID="plus-welcome-done"
        />
      </View>
    </SafeFrame>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  middle: { flexGrow: 1, justifyContent: 'center', paddingBottom: spacing.md },
  stage: { alignItems: 'center', justifyContent: 'flex-end' },
  bit: { position: 'absolute' },
  pocket: { alignItems: 'center', justifyContent: 'flex-end', transformOrigin: 'bottom' },
  back: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  // The card never shows below the sleeve: what has not risen yet is still inside it.
  window: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  // At rest the card's foot sits 28 points inside the sleeve's mouth, as the board has it.
  riser: { alignItems: 'center', marginBottom: 120 },
  scootch: { marginBottom: -32 },
  front: {
    width: '100%',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: SLEEVE.radius,
    borderBottomRightRadius: SLEEVE.radius,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    boxShadow: '0 24px 40px -20px rgba(28,26,23,0.45)',
  },
  sleeveNumber: {
    fontFamily: STAMPED,
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 2,
    color: SLEEVE_MUTED,
  },
  sleeveWords: { fontFamily: fonts.heading, fontWeight: '800', fontSize: 15, color: SLEEVE_INK },
  words: { paddingHorizontal: 26, gap: 10, alignItems: 'center', marginTop: spacing.lg },
  title: { fontFamily: fonts.heading, fontWeight: '900', letterSpacing: -1.5, textAlign: 'center' },
  centred: { textAlign: 'center' },
  foot: { paddingHorizontal: 26, paddingBottom: spacing.md, gap: spacing.sm },
});
