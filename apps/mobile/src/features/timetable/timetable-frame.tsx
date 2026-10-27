import { useEffect, useMemo, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Classroom } from '../../classroom/classroom';
import { useLanguage, useT } from '../../i18n/i18n-provider';
import type { BoardSnapshot } from '../../state/board-view';
import {
  deskSheetRestTop,
  timetableOpenTop,
  timetablePullFromDesk,
  timetablePullHeld,
  timetablePullVelocity,
  timetableTravel,
  usePullRoute,
  type PullFromDesk,
} from '../../ui/motion/hand-off';
import { DUO } from '../../ui/fold/fold-layout';
import { useFold } from '../../ui/fold/use-fold';
import { PressSpring } from '../../ui/motion/press-spring';
import { useScreenStyle } from '../../ui/use-screen-style';
import { deskModel } from '../desk/desk-model';
import { chalkDate, chalkWords, drawnCarvings } from '../desk/room-scene';
import { timetableOpensOnRelease } from '../desk/pull-release';
import { Mark } from '../tuition/marks';
import { paper, Sized } from '../tuition/receipt-parts';

/** Pulled down past this share of the way, the timetable closes. */
const CLOSES_BELOW = 0.75;
/** A flick this fast (points a second) decides whatever the distance; never a flick up to close. */
const FLICK = 600;
/** The timetable's sheet has taken over from the desk's by this much of the way. */
const SHEET_TAKES_OVER = 0.55;

function clamp01(value: number): number {
  'worklet';
  return Math.max(0, Math.min(1, value));
}

export interface TimetableFrameProps {
  /** 0 with the desk sheet at rest, 1 with the timetable open: the desk's `timetablePull`. */
  readonly progress: SharedValue<number>;
  readonly snapshot: BoardSnapshot;
  readonly name: string | null;
  /** Called once the sheet is back on the desk, to leave the route. */
  readonly onClosed: () => void;
  readonly mayMove: boolean;
  /**
   * True on the route, over the desk: it finishes the desk's swipe, and draws only the scrim and
   * the sheet, the desk itself showing behind. Drawn alone, the frame draws the room itself.
   */
  readonly overDesk?: boolean;
  /** What goes under the heading; given the frame's own close, which settles the sheet home. */
  readonly children: ReactNode | ((close: () => void) => ReactNode);
}

/**
 * The desk sheet swiped up: the classroom stays behind under a scrim, and the sheet rises from
 * where the desk's sheet rests, its task kept at the top, following the same pull the desk's swipe
 * drove and moved by the same travel, so the two are one sheet. Pulling the top down, the close
 * button or a tap on the room settles it back with the one settle, carrying the finger's speed.
 */
export function TimetableFrame(props: TimetableFrameProps) {
  const t = useT();
  // On iPhone Duo the system's time and status run down the trailing edge: the close keeps clear.
  const clearOfStatus = useFold().controls === 'trailing' ? { marginRight: DUO.column - 20 } : null;
  const { largeText } = useScreenStyle();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { progress, mayMove, onClosed, overDesk = false } = props;
  const model = useMemo(
    () => deskModel({ snapshot: props.snapshot, language, name: props.name }),
    [props.snapshot, language, props.name],
  );
  const words = chalkWords(model.chalk, t);
  const insetTop = insets.top;

  // The desk's swipe up, as the timetable finishes it: the desk's own decision, in its points.
  const fromDesk: PullFromDesk = {
    held: timetablePullHeld,
    fromDesk: timetablePullFromDesk,
    velocity: timetablePullVelocity,
    opens: (share, velocity) => {
      'worklet';
      return timetableOpensOnRelease(share, velocity * timetableTravel(height, insetTop));
    },
  };
  const route = usePullRoute(progress, mayMove, onClosed, overDesk ? fromDesk : undefined);
  const close = route.closeFromTap;
  // Gone, the desk sheet is home.
  useEffect(() => () => progress.set(0), [progress]);

  const start = useSharedValue(1);
  const pull = Gesture.Pan()
    .activeOffsetY(8)
    .onStart(() => {
      start.set(clamp01(progress.get()));
      route.dragging.set(true);
    })
    .onUpdate((event) => {
      progress.set(clamp01(start.get() - event.translationY / timetableTravel(height, insetTop)));
    })
    .onEnd((event) => {
      route.dragging.set(false);
      const velocity = -event.velocityY / timetableTravel(height, insetTop);
      const closes =
        (progress.get() < CLOSES_BELOW && event.velocityY > -FLICK) || event.velocityY > FLICK;
      if (closes) route.close(velocity);
      else route.open(velocity, false);
    })
    .onFinalize(() => {
      route.dragging.set(false);
    });

  const sheetStyle = useAnimatedStyle(() => {
    const p = clamp01(progress.get());
    return {
      opacity: clamp01(p / SHEET_TAKES_OVER),
      transform: [{ translateY: deskSheetRestTop(height) - p * timetableTravel(height, insetTop) }],
    };
  });
  const scrimStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(30,22,14,${(clamp01(progress.get()) * 0.28).toFixed(3)})`,
  }));
  const contentStyle = useAnimatedStyle(() => {
    const p = progress.get();
    return {
      opacity: clamp01((p - 0.3) / 0.7),
      transform: [{ translateY: (1 - p) * 40 }],
    };
  });

  const desk = model.task;

  return (
    <Animated.View style={[styles.fill, route.shownStyle]} testID="timetable">
      {overDesk ? null : (
        <View style={[StyleSheet.absoluteFill, styles.wall]}>
          <Classroom
            style={[styles.room, { top: insets.top }]}
            framing="desk"
            mood={model.mood}
            chalk={words.chalk}
            date={chalkDate(props.snapshot.now.at, language)}
            more={words.more}
            carvings={drawnCarvings(props.snapshot.carvings, props.name)}
          />
        </View>
      )}
      <Animated.View style={[StyleSheet.absoluteFill, scrimStyle]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('timetable.close')}
          onPress={close}
          style={styles.fill}
        />
      </Animated.View>
      <Animated.View style={[styles.sheet, { height: height + 40 }, sheetStyle]}>
        <GestureDetector gesture={pull}>
          <View>
            <View style={styles.grabber} />
            <View style={styles.head}>
              <View style={styles.headText}>
                {desk !== null ? (
                  <>
                    <Sized size={12} style={[styles.label, styles.onDesk]}>
                      {t('desk.onYourDesk').toLocaleUpperCase(language)}
                    </Sized>
                    <Sized size={19} lines={largeText ? 3 : 1} style={styles.task} role="header">
                      {desk.title}
                    </Sized>
                  </>
                ) : (
                  <Sized size={21} style={styles.task} role="header">
                    {t('timetable.title')}
                  </Sized>
                )}
              </View>
              <PressSpring
                testID="timetable-close"
                accessibilityRole="button"
                accessibilityLabel={t('timetable.close')}
                onPress={close}
                hitSlop={8}
                style={[styles.close, clearOfStatus]}
              >
                <Mark name="close" color={paper.ink} size={13} weight={2.6} />
              </PressSpring>
            </View>
          </View>
        </GestureDetector>
        <Animated.View style={[styles.fill, contentStyle]}>
          <ScrollView
            contentContainerStyle={{
              paddingBottom: insets.bottom + timetableOpenTop(insetTop) + 60,
            }}
            showsVerticalScrollIndicator={false}
          >
            {typeof props.children === 'function' ? props.children(close) : props.children}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  wall: { backgroundColor: '#FFF1DC' },
  room: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: '#FFFDF9',
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    boxShadow: '0 -8px 30px rgba(60,40,20,0.10), inset 0 1px 0 rgba(255,255,255,0.9)',
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 5,
    borderRadius: 3,
    marginTop: 10,
    backgroundColor: 'rgba(28,26,24,0.16)',
  },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
  },
  headText: { flex: 1, gap: 6 },
  label: { fontWeight: '700', letterSpacing: 0.7, color: paper.muted },
  onDesk: { color: paper.red },
  task: { fontWeight: '700', letterSpacing: -0.4, color: paper.ink },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(28,26,24,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
