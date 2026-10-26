import type { SkTypeface } from '@shopify/react-native-skia';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { HAND_FAMILY } from '../../classroom/use-hand-font';
import { useT } from '../../i18n/i18n-provider';
import { useFeel } from '../../ui/motion/use-feel';
import { useScreenStyle } from '../../ui/use-screen-style';
import { LogbookPage } from '../logbook/logbook-page';
import { logbookPull } from '../logbook/logbook-pull';
import type { LogbookRow } from '../logbook/logbook-rows';

import { clamp01, SETTLE } from './board-grow';
import { BOARD, PAPER } from './chalk';

/** The logbook's hint turns from "pull" to "let go" here. */
const HINT_TURNS = BOARD.logbookOpensPast / BOARD.logbookTravel;

/**
 * The pull down on the board's heading. The page follows the finger; let go past the mark, or
 * flick, and the logbook route opens and carries on from there. Anything less springs back.
 */
export function useLogbookPull() {
  const router = useRouter();
  const { mayMove } = useFeel();
  const open = useCallback(() => router.push('/logbook'), [router]);
  const headerPan = usePanGesture({
    activeOffsetY: 10,
    failOffsetY: -10,
    failOffsetX: [-24, 24],
    onUpdate: (event) => {
      'worklet';
      if (mayMove) {
        logbookPull.set(clamp01(Math.max(0, event.translationY) / BOARD.logbookTravel));
      }
    },
    onDeactivate: (event) => {
      'worklet';
      const opens =
        !event.canceled &&
        (event.translationY > BOARD.logbookOpensPast || event.velocityY > BOARD.flick);
      if (opens) scheduleOnRN(open);
      else logbookPull.set(withSpring(0, SETTLE));
    },
  });
  const headerFollows = useAnimatedStyle(() => ({
    transform: [{ translateY: logbookPull.get() * BOARD.logbookTravel * 0.35 }],
  }));
  return { open, headerPan, headerFollows };
}

/**
 * The logbook page as it lowers over the board, with the board dimming under it. Drawn on the
 * board for the length of the pull; the logbook route draws the same page once it opens.
 */
export function LogbookPreview({
  rows,
  week,
  hand,
}: {
  readonly rows: readonly LogbookRow[];
  readonly week: number;
  readonly hand: SkTypeface | null;
}) {
  const t = useT();
  const { size, allowFontScaling } = useScreenStyle();
  const { height } = useWindowDimensions();
  const dim = useAnimatedStyle(() => ({ opacity: logbookPull.get() }));
  const lowering = useAnimatedStyle(() => ({
    transform: [{ translateY: -(1 - logbookPull.get()) * height * 1.02 }],
    shadowOpacity: logbookPull.get() > 0 && logbookPull.get() < 1 ? 0.28 : 0.12,
  }));
  const pullHint = useAnimatedStyle(() => ({
    opacity: logbookPull.get() > HINT_TURNS ? 0 : clamp01(logbookPull.get() * 3),
  }));
  const releaseHint = useAnimatedStyle(() => ({
    opacity: logbookPull.get() > HINT_TURNS ? 1 : 0,
  }));
  const hintText = [styles.hintText, { color: PAPER.light.red, fontSize: size(17) }];

  return (
    <>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.dim, dim]} />
      <Animated.View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[StyleSheet.absoluteFill, styles.lowering, lowering]}
      >
        <LogbookPage
          rows={rows}
          week={week}
          hand={hand}
          hint={
            <View style={styles.hint}>
              <Animated.View style={[styles.hintRow, pullHint]}>
                <Text allowFontScaling={allowFontScaling} style={hintText}>
                  ↓ {t('board.logbookHint.pull')}
                </Text>
              </Animated.View>
              <Animated.View style={[styles.hintRow, styles.hintOver, releaseHint]}>
                <Text allowFontScaling={allowFontScaling} style={hintText}>
                  ↑ {t('board.logbookHint.release')}
                </Text>
              </Animated.View>
            </View>
          }
        />
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  dim: {
    backgroundColor: 'rgba(8,20,16,0.4)',
  },
  lowering: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowRadius: 20,
  },
  hint: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 120,
    alignItems: 'center',
  },
  hintRow: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  hintOver: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
  },
  hintText: {
    fontFamily: HAND_FAMILY,
    textAlign: 'center',
  },
});
