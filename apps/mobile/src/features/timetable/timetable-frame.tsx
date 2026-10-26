import { useMemo, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  useAnimatedStyle,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { Classroom } from '../../classroom/classroom';
import { useLanguage, useT } from '../../i18n/i18n-provider';
import type { BoardSnapshot } from '../../state/board-view';
import { taskCardFrame } from '../../ui/motion/hand-off';
import { deskModel } from '../desk/desk-model';
import { chalkDate, chalkWords, drawnCarvings } from '../desk/room-scene';
import { Mark } from '../tuition/marks';
import { paper, Sized } from '../tuition/receipt-parts';

/** How far the desk sheet travels up to become the timetable, as the desk's swipe counts it. */
export const TIMETABLE_TRAVEL = 464;
/** Pulled down past this share of the way, the timetable closes. */
const CLOSES_BELOW = 0.75;
const FLICK = 900;
const SETTLE = { damping: 26, stiffness: 260, mass: 1 } as const;
/** From the sheet's top edge to the task's title, as the desk's sheet lays it out. */
const CARD_INSET = 30;

export interface TimetableFrameProps {
  /** 0 with the desk sheet at rest, 1 with the timetable open: the desk's `timetablePull`. */
  readonly progress: SharedValue<number>;
  readonly snapshot: BoardSnapshot;
  readonly name: string | null;
  /** Called once the sheet is down, to leave the route. */
  readonly onClosed: () => void;
  readonly mayMove: boolean;
  readonly children: ReactNode;
}

/**
 * The desk sheet swiped up: the classroom stays behind under a scrim, and the sheet rises from
 * where the desk's sheet was, its task kept at the top, following the same pull the desk's swipe
 * drove. Pulling the top down, the close button or a tap on the room puts it back.
 */
export function TimetableFrame(props: TimetableFrameProps) {
  const t = useT();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { progress, mayMove, onClosed } = props;
  const model = useMemo(
    () => deskModel({ snapshot: props.snapshot, language, name: props.name }),
    [props.snapshot, language, props.name],
  );
  const words = chalkWords(model.chalk, t);

  // Where the sheet starts: the desk's sheet, its top edge just above the task card.
  const frame = taskCardFrame.get();
  const startTop = frame === null ? height * 0.55 : Math.max(0, frame.y - CARD_INSET);
  const openTop = insets.top + 12;

  // Back down to the desk sheet, then off the route. The spring's end runs on the UI thread.
  const close = () => {
    'worklet';
    if (!mayMove) {
      progress.set(0);
      scheduleOnRN(onClosed);
      return;
    }
    progress.set(
      withSpring(0, SETTLE, (finished) => {
        if (finished === true) scheduleOnRN(onClosed);
      }),
    );
  };
  const closeFromTap = () => {
    if (!mayMove) {
      progress.set(0);
      onClosed();
      return;
    }
    progress.set(
      withSpring(0, SETTLE, (finished) => {
        'worklet';
        if (finished === true) scheduleOnRN(onClosed);
      }),
    );
  };

  const pull = Gesture.Pan()
    .activeOffsetY(8)
    .onChange((event) => {
      const span = Math.max(1, startTop - openTop);
      progress.set(Math.min(1, Math.max(0, progress.get() - event.changeY / span)));
    })
    .onEnd((event) => {
      if (progress.get() < CLOSES_BELOW || event.velocityY > FLICK) close();
      else progress.set(mayMove ? withSpring(1, SETTLE) : 1);
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(progress.get(), [0, 1], [startTop, openTop]) }],
  }));
  const scrimStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(30,22,14,${(Math.min(1, Math.max(0, progress.get())) * 0.28).toFixed(3)})`,
  }));
  const contentStyle = useAnimatedStyle(() => {
    const p = progress.get();
    return {
      opacity: Math.min(1, Math.max(0, (p - 0.3) / 0.7)),
      transform: [{ translateY: (1 - p) * 40 }],
    };
  });

  const desk = model.task;

  return (
    <View style={styles.fill} testID="timetable">
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
      <Animated.View style={[StyleSheet.absoluteFill, scrimStyle]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('timetable.close')}
          onPress={closeFromTap}
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
                    <Sized size={12} style={styles.label}>
                      {t('desk.onYourDesk').toLocaleUpperCase(language)}
                    </Sized>
                    <Sized size={21} lines={2} style={styles.task} role="header">
                      {desk.title}
                    </Sized>
                  </>
                ) : (
                  <Sized size={21} style={styles.task} role="header">
                    {t('timetable.title')}
                  </Sized>
                )}
              </View>
              <Pressable
                testID="timetable-close"
                accessibilityRole="button"
                accessibilityLabel={t('timetable.close')}
                onPress={closeFromTap}
                hitSlop={8}
                style={styles.close}
              >
                <Mark name="close" color={paper.ink} size={13} weight={2.6} />
              </Pressable>
            </View>
          </View>
        </GestureDetector>
        <Animated.View style={[styles.fill, contentStyle]}>
          <ScrollView
            contentContainerStyle={{ paddingBottom: insets.bottom + openTop + 60 }}
            showsVerticalScrollIndicator={false}
          >
            {props.children}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </View>
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
  headText: { flex: 1, gap: 4 },
  label: { fontWeight: '700', letterSpacing: 0.7, color: paper.muted },
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
