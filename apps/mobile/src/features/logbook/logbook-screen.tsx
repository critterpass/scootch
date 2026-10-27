import { useRouter, type Href } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useHandFont } from '../../classroom/use-hand-font';
import { useLanguage, useT } from '../../i18n/i18n-provider';
import { useAppearance } from '../../screens/registry/support/forced-variant';
import { useBoard } from '../../state/board-provider';
import { goBack } from '../../ui/motion/go-back';
import { usePullRoute } from '../../ui/motion/hand-off';
import { PressSpring, touchHaptic } from '../../ui/motion/press-spring';
import { useFeel } from '../../ui/motion/use-feel';
import { BOARD, PAPER } from '../board/chalk';
import { useCareGuard } from '../care/use-care-guard';
import { useTuition } from '../tuition/tuition-provider';

import { LogbookPage } from './logbook-page';
import { logbookPull } from './logbook-pull';
import { isoWeek, logbookRows } from './logbook-rows';
import { ReportCardRow } from './report-card-row';

const REPORT_CARD = '/report-card' as Href;

/**
 * The logbook route: the page lowered over the board. It carries on from wherever the board's
 * pull left it, already moving, and the handle at its foot pushes it back up (drag it, or tap it)
 * with the finger's speed.
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

  const leave = useCallback(() => goBack(router, '/board'), [router]);
  const route = usePullRoute(logbookPull, mayMove, leave);
  const feelClose = useCallback(() => {
    if (haptics) touchHaptic('choice');
  }, [haptics]);
  const close = useCallback(() => {
    feelClose();
    route.closeFromTap();
  }, [feelClose, route]);

  // The push up on the handle, from wherever the page is when the finger takes it.
  const start = useSharedValue(1);
  const pushUp = usePanGesture({
    activeOffsetY: -8,
    failOffsetX: [-24, 24],
    onActivate: () => {
      'worklet';
      start.set(logbookPull.get());
      route.dragging.set(true);
    },
    onUpdate: (event) => {
      'worklet';
      if (mayMove) {
        logbookPull.set(
          Math.max(0, Math.min(1, start.get() + event.translationY / BOARD.logbookTravel)),
        );
      }
    },
    onDeactivate: (event) => {
      'worklet';
      route.dragging.set(false);
      const velocity = event.velocityY / BOARD.logbookTravel;
      const closes =
        !event.canceled &&
        event.velocityY < BOARD.flick &&
        (event.translationY < -100 || event.velocityY < -BOARD.flick);
      if (closes) {
        scheduleOnRN(feelClose);
        route.close(velocity);
      } else route.open(velocity, false);
    },
    onFinalize: () => {
      'worklet';
      route.dragging.set(false);
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
    <Animated.View style={[styles.fill, page, route.shownStyle]} testID="logbook-screen">
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
            <PressSpring
              testID="logbook-close"
              accessibilityRole="button"
              accessibilityLabel={t('logbook.close')}
              accessibilityHint={t('logbook.close.hint')}
              onPress={close}
              style={styles.handle}
            >
              <View style={[styles.bar, { backgroundColor: ink.handle }]} />
            </PressSpring>
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
