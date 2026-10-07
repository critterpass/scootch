import { Canvas, Circle, RadialGradient } from '@shopify/react-native-skia';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  ReduceMotion,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { spacing } from '@scootch/tokens';

import { useCue } from '../../state/day-store-provider';
import { RiseIn } from '../../ui/motion/rise-in';
import { useFeel } from '../../ui/motion/use-feel';
import { useScreenStyle } from '../../ui/use-screen-style';
import { SessionText } from '../session/ui/session-text';

import { skipControl, type RevealStepProps } from './reveal-model';
import { useCardMotion } from './ui/card-motion';
import { easedRun } from './ui/eased-run';
import { cardCanvasSize, cardWidthIn } from './ui/card-size';
import { CardStamp } from './ui/card-stamp';
import { HandledCard } from './ui/handled-card';
import { Dock, KeepFrame } from './ui/keep-frame';

/**
 * The board's reveal (`[data-anim="flip"]`, `"glow"`, `"stamp2"`), on its own clock of 6.4
 * seconds. The board waits on the card's back for over a second before anything moves; the phone
 * joins the clock half a second in, so the back is seen and the wait is not felt.
 */
const BOARD_MS = 6400;
const JOINS_AT_MS = 500;
const FLIP = {
  at: [0.08, 0.2, 0.26, 0.31],
  degrees: [180, -14, 6, 0],
  scales: [0.86, 1.05, 0.99, 1],
  /** When the card starts to turn and when it has settled, in milliseconds on the board's clock. */
  startsMs: 1154,
  endsMs: 1926,
} as const;
/**
 * The whole clock is eased by the board's curve, cubic-bezier(.45, 0, .2, 1), and the flip's
 * keyframes sit along that eased run. The stretch of the curve the flip uses is worked out once,
 * as plain numbers the UI thread can read.
 */
const EASED = easedRun(0.45, 0, 0.2, 1, FLIP.endsMs / BOARD_MS, 48);

/** The glow behind the card: it swells from 0.6 to 1.3 as the card comes round, then dies away. */
const GLOW = {
  size: 300,
  times: [640, 1536, 3200, BOARD_MS],
  opacity: [0, 1, 0.5, 0],
  scales: [0.6, 1.3, 1.1, 0.8],
} as const;
/** The stamp starts down after the card has landed. */
const STAMP_AT_MS = 1920;
const STAMP_LANDS_AFTER_MS = 384;

/** Words Scootch says. They always come in from the store: no step writes one itself. */
export function SpokenLine({ line }: { readonly line: string }) {
  const { palette } = useScreenStyle();
  return (
    <SessionText
      face="body"
      color={palette.ink}
      accessibilityLiveRegion="polite"
      testID="reveal-line"
    >
      {line}
    </SessionText>
  );
}

/**
 * The card turns over from its back as the board plays it: round past the front with an
 * overshoot while a glow swells behind it, then the CAUGHT stamp thumps down on the settled card.
 * A whoosh and a tap go with the turn, a click and a thump with the stamp. After that the card is
 * in the hand: it leans, turns over and catches the light. With Reduce Motion it is simply there,
 * face up and stamped.
 */
export function CardStep({ model, actions, t }: RevealStepProps) {
  const { width: screen } = useWindowDimensions();
  const feel = useFeel();
  const playCue = useCue();
  // One answer to "does this move": the model's, which the card and its sensor follow too. With no
  // card to show there is nothing to turn and nothing to sound.
  const moving = model.tilting && model.card !== null;
  // A cue that cannot play must never take the reveal down with it.
  const sound = (cue: string) => {
    try {
      playCue(cue);
    } catch {
      // The reveal goes on without the sound.
    }
  };
  // The board's card is 330 points wide; a narrower phone gets what fits beside the stamp.
  const cardWidth = cardWidthIn({ width: screen, height: Number.POSITIVE_INFINITY });
  const canvas = cardCanvasSize(cardWidth);
  // Once it has landed the card is the person's to handle.
  const [landed, setLanded] = useState(!moving);
  const motion = useCardMotion({
    mayMove: moving && landed,
    handled: landed,
    width: canvas.width,
    height: canvas.height,
    // The step is a page that scrolls on a small phone or at a large text size: a drag up or
    // down stays the page's, and the card takes sideways ones.
    besideScroll: true,
    ...(moving ? { startsAt: { flip: FLIP.degrees[0], scale: FLIP.scales[0] } } : {}),
  });
  const { flip, scale } = motion;

  /** Milliseconds on the board's clock. */
  const clock = useSharedValue(moving ? JOINS_AT_MS : BOARD_MS);
  useEffect(() => {
    if (!moving) return undefined;
    clock.value = withTiming(BOARD_MS, {
      duration: BOARD_MS - JOINS_AT_MS,
      easing: Easing.linear,
      reduceMotion: ReduceMotion.Never,
    });
    const timers = [
      setTimeout(() => sound('send'), FLIP.startsMs - JOINS_AT_MS),
      setTimeout(() => setLanded(true), FLIP.endsMs - JOINS_AT_MS + 40),
      setTimeout(
        () => {
          sound('tick');
          if (feel.haptics) {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => undefined);
          }
        },
        STAMP_AT_MS + STAMP_LANDS_AFTER_MS * 0.8 - JOINS_AT_MS,
      ),
    ];
    return () => {
      timers.forEach(clearTimeout);
      cancelAnimation(clock);
    };
    // Played once, for the card this step was opened with.
  }, []);
  // The clock turns the card until it has landed; from then on the card is moved by the hand.
  useAnimatedReaction(
    () => clock.value,
    (ms, before) => {
      if (before === null || before > FLIP.endsMs) return;
      const along = interpolate(ms / BOARD_MS, EASED.times, EASED.along, 'clamp');
      flip.value = interpolate(along, FLIP.at, FLIP.degrees, 'clamp');
      scale.value = interpolate(along, FLIP.at, FLIP.scales, 'clamp');
    },
  );
  const glow = useAnimatedStyle(() => ({
    opacity: moving ? interpolate(clock.value, GLOW.times, GLOW.opacity, 'clamp') : 0,
    transform: [{ scale: interpolate(clock.value, GLOW.times, GLOW.scales, 'clamp') }],
  }));
  const stampSince = useDerivedValue(() => clock.value - STAMP_AT_MS);

  return (
    <KeepFrame
      testID="reveal-card"
      close={skipControl(actions, t)}
      closeTestID="reveal-skip"
      footer={
        <Dock
          action={{
            label: t('reveal.next'),
            hint: t('reveal.next.hint'),
            testID: 'reveal-next',
            onPress: actions.next,
          }}
        />
      }
    >
      {/* A catch whose card cannot be drawn still has its frame: Skip and Next are always there. */}
      <View style={styles.centre}>
        <Animated.View pointerEvents="none" style={[styles.glow, glow]}>
          <Canvas style={styles.glowCanvas}>
            <Circle cx={GLOW.size / 2} cy={GLOW.size / 2} r={GLOW.size / 2}>
              <RadialGradient
                c={{ x: GLOW.size / 2, y: GLOW.size / 2 }}
                r={GLOW.size / 2}
                colors={['rgba(240,86,46,0.35)', 'rgba(240,86,46,0)']}
                positions={[0, 0.65]}
              />
            </Circle>
          </Canvas>
        </Animated.View>
        {model.card ? (
          <HandledCard
            card={model.card}
            language={model.language}
            cardWidth={cardWidth}
            motion={motion}
            stamped={!moving}
            testID="reveal-card-face"
            {...(moving
              ? {
                  overFront: (
                    <CardStamp
                      card={model.card}
                      language={model.language}
                      cardWidth={cardWidth}
                      sinceMs={stampSince}
                    />
                  ),
                }
              : {})}
          />
        ) : null}
      </View>
      {model.line && landed ? (
        <RiseIn>
          <SpokenLine line={model.line} />
        </RiseIn>
      ) : null}
    </KeepFrame>
  );
}

const styles = StyleSheet.create({
  // The card's canvas is wider than the frame's margins leave: it runs to the screen's edges.
  centre: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    marginHorizontal: -spacing.lg,
  },
  glow: { position: 'absolute', width: GLOW.size, height: GLOW.size },
  glowCanvas: { width: GLOW.size, height: GLOW.size },
});
