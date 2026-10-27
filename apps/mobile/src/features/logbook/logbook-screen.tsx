import { useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useHandFont } from '../../classroom/use-hand-font';
import { useLanguage, useT } from '../../i18n/i18n-provider';
import { useAppearance } from '../../screens/registry/support/forced-variant';
import { useBoard } from '../../state/board-provider';
import { goBack } from '../../ui/motion/go-back';
import { SPRING_CURVE } from '../../ui/motion/motion-tokens';
import { touchHaptic } from '../../ui/motion/press-spring';
import { useFeel } from '../../ui/motion/use-feel';
import { BOARD, PAPER } from '../board/chalk';
import { useCareGuard } from '../care/use-care-guard';
import { useTuition } from '../tuition/tuition-provider';

import { LogbookPage } from './logbook-page';
import { logbookPull } from './logbook-pull';
import { isoWeek, logbookRows } from './logbook-rows';
import { ReportCardRow } from './report-card-row';

const REPORT_CARD = '/report-card' as Href;

const ALWAYS = ReduceMotion.Never;
const SETTLE = { duration: 420, dampingRatio: 0.9, reduceMotion: ALWAYS } as const;

/**
 * The logbook route: the page lowered over the board. It carries on from wherever the board's
 * pull left it, and the handle at its foot pushes it back up (drag it, or tap it).
 */
export function LogbookScreen() {
  const crisis = useCareGuard();
  const snapshot = useBoard();
  const t = useT();
  const { language } = useLanguage();
  const hand = useHandFont();
  const router = useRouter();
  const { mayMove, haptics } = useFeel();
  const { height } = useWindowDimensions();
  const ink = PAPER[useAppearance()];
  const { enrolled } = useTuition();

  useEffect(() => {
    if (!mayMove) logbookPull.set(1);
    else {
      logbookPull.set(
        withTiming(1, { duration: BOARD.openMs, easing: SPRING_CURVE, reduceMotion: ALWAYS }),
      );
    }
    // The page comes down once, as the route arrives.
  }, []);

  const leave = useCallback(() => goBack(router, '/board'), [router]);
  const close = useCallback(() => {
    if (haptics) touchHaptic('choice');
    if (!mayMove) {
      logbookPull.set(0);
      leave();
      return;
    }
    logbookPull.set(
      withTiming(
        0,
        { duration: BOARD.closeMs, easing: SPRING_CURVE, reduceMotion: ALWAYS },
        (finished) => {
          if (finished) scheduleOnRN(leave);
        },
      ),
    );
  }, [haptics, mayMove, leave]);

  const pushUp = usePanGesture({
    activeOffsetY: -8,
    failOffsetX: [-24, 24],
    onUpdate: (event) => {
      'worklet';
      if (mayMove) {
        logbookPull.set(Math.max(0, 1 + Math.min(0, event.translationY) / BOARD.logbookTravel));
      }
    },
    onDeactivate: (event) => {
      'worklet';
      const closes =
        !event.canceled && (event.translationY < -100 || event.velocityY < -BOARD.flick);
      if (closes) scheduleOnRN(close);
      else logbookPull.set(withSpring(1, SETTLE));
    },
  });

  const page = useAnimatedStyle(() => ({
    transform: [{ translateY: -(1 - logbookPull.get()) * height * 1.02 }],
  }));

  const today = snapshot.now.day;
  const rows = useMemo(
    () =>
      logbookRows(snapshot.logbook, today, language, {
        minutes: (minutes) => t('logbook.minutes', { minutes }),
        ticked: t('logbook.ticked'),
        certificate: t('logbook.certificate'),
      }),
    [snapshot.logbook, today, language, t],
  );

  if (crisis) return <View style={[styles.fill, { backgroundColor: ink.page }]} />;

  return (
    <Animated.View style={[styles.fill, page]} testID="logbook-screen">
      <LogbookPage
        testID="logbook"
        rows={rows}
        week={isoWeek(today)}
        hand={hand}
        foot={
          <ReportCardRow ink={ink} enrolled={enrolled} onPress={() => router.push(REPORT_CARD)} />
        }
        handle={
          <GestureDetector gesture={pushUp}>
            <Pressable
              testID="logbook-close"
              accessibilityRole="button"
              accessibilityLabel={t('logbook.close')}
              accessibilityHint={t('logbook.close.hint')}
              onPress={close}
              style={styles.handle}
            >
              <View style={[styles.bar, { backgroundColor: ink.handle }]} />
            </Pressable>
          </GestureDetector>
        }
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  handle: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: {
    width: 40,
    height: 5,
    borderRadius: 3,
  },
});
