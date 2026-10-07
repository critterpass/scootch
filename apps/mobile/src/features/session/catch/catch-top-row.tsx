import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  interpolate,
  LinearTransition,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Scootch } from '../../../art/Scootch';
import { RoundButton as GlassRound } from '../../../ui/buttons';
import { glassPressOwner, GlassSurface } from '../../../ui/glass-surface';
import { MoreIcon } from '../../../ui/icons';
import { SPRING_CURVE } from '../../../ui/motion/motion-tokens';
import { PressSpring } from '../../../ui/motion/press-spring';
import type { ScreenProps } from '../screens/screen-props';
import { RoundButton } from '../ui/controls';
import { PillDot } from '../ui/pill-marks';
import { SessionText } from '../ui/session-text';

import { clockLeft, endsAtClock, type CatchStage } from './catch-flow';

/** The corner row's height. */
export const ROW = 44;
/** How long the row takes to change shape, on the boards' soft-landing curve. */
const SHAPE_MS = 420;
const WORDS_MS = 220;
/** Scootch in his corner, and brought up large by a tap. */
const SCOOTCH = { small: 48, large: 76 } as const;

/**
 * The shapes the row takes. `row` is as the board draws it: the task in its pill and the time
 * beside it. `zoomed` brings Scootch up large in his corner, and the task steps back a little
 * towards the time to give him the room.
 * `title` gives the task the time's room too, so a long one can be read whole.
 */
type RowShape = 'row' | 'zoomed' | 'title';

export interface CatchTopRowProps extends ScreenProps {
  readonly stage: CatchStage;
  /** The session is on the stuck card, or in its last two minutes: Scootch shows it. */
  readonly stuck: boolean;
  readonly twoMinutesLeft: boolean;
  /** There is a corner menu at this stage. */
  readonly hasMenu: boolean;
  readonly onMenu: () => void;
  /** "I did it", pressed after a "Not yet". */
  readonly onDidIt: () => void;
}

/** How Scootch, small in the corner, takes each moment of a catch. */
function scootchMood(stage: CatchStage, stuck: boolean, twoMinutesLeft: boolean) {
  if (stage === 'caught') return 'celebrating';
  if (stage === 'asking' || stage === 'ready') return 'nudge';
  if (stage === 'coach') return 'waiting';
  if (stuck) return 'stuck';
  return twoMinutesLeft ? 'shocked' : 'working';
}

/**
 * The top of a catch: Scootch, small; the task in its pill; the time left, which turns into what
 * the moment asks ("Time's up", "I did it", "Done", "Caught"); and the corner control.
 *
 * Each of the first three answers a tap, and the row changes shape in one soft movement. Scootch
 * comes up large while the task steps back, and goes small again. The task's pill opens to show the task
 * whole, taking the time's room, and closes again. The time, while it counts, turns between how
 * long is left and when it ends. Nothing here starts, stops or changes the session.
 */
export function CatchTopRow(props: CatchTopRowProps) {
  const { model, actions, inks, t, stage } = props;
  const [shape, setShape] = useState<RowShape>('row');
  const [showsEnd, setShowsEnd] = useState(false);
  const zoomed = shape === 'zoomed';
  // How far Scootch has come up: 0 small in his corner, 1 large. It runs on the UI thread, and
  // where nothing may move it is simply one or the other.
  const up = useSharedValue(0);
  useEffect(() => {
    up.value = model.reducedMotion
      ? Number(zoomed)
      : withTiming(Number(zoomed), {
          duration: SHAPE_MS,
          easing: SPRING_CURVE,
          reduceMotion: ReduceMotion.Never,
        });
  }, [zoomed, model.reducedMotion, up]);
  const room = useAnimatedStyle(() => {
    const side = interpolate(up.value, [0, 1], [SCOOTCH.small, SCOOTCH.large]);
    return { width: side, height: side };
  });
  const grown = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(up.value, [0, 1], [1, SCOOTCH.large / SCOOTCH.small]) }],
  }));
  // The task steps back towards the time: a little smaller and a little fainter, never gone.
  const smaller = useAnimatedStyle(() => ({
    opacity: interpolate(up.value, [0, 1], [1, 0.78]),
    transform: [{ scale: interpolate(up.value, [0, 1], [1, 0.88]) }],
  }));
  const counting = stage === 'setting' || stage === 'coach';
  const left = stage === 'coach' ? 1 : model.fraction;
  const corner =
    stage === 'asking'
      ? t('session.catch.timeUp')
      : stage === 'waiting'
        ? t('session.catch.didIt')
        : stage === 'ready'
          ? t('session.catch.unlocked')
          : stage === 'caught'
            ? t('session.catch.caught')
            : showsEnd
              ? t('session.catch.until', {
                  time: endsAtClock(left, model.plannedMinutes, Date.now()),
                })
              : clockLeft(left, model.plannedMinutes);
  // What the moment asks is never hidden: only the plain count makes way for a long task.
  const timeShown = !(counting && shape === 'title');

  const still = model.reducedMotion;
  // Spread onto each part of the row: where nothing may move there is no layout animation at all.
  const reshape = still
    ? {}
    : {
        layout: LinearTransition.duration(SHAPE_MS)
          .easing(SPRING_CURVE)
          .reduceMotion(ReduceMotion.Never),
      };
  const arrive = FadeIn.duration(WORDS_MS).reduceMotion(ReduceMotion.Never);
  const leave = FadeOut.duration(still ? 0 : 140).reduceMotion(ReduceMotion.Never);

  return (
    <>
      <PressSpring
        accessibilityRole="button"
        accessibilityLabel={t('brand.name')}
        accessibilityHint={t(zoomed ? 'session.catch.untuck.hint' : 'session.catch.tuck.hint')}
        onPress={() => setShape((now) => (now === 'zoomed' ? 'row' : 'zoomed'))}
        feedback="choice"
        hitSlop={6}
        testID="session-scootch-button"
      >
        {/* His room in the row grows with him, so the pill beside him gives way as he comes up. */}
        <Animated.View pointerEvents="none" style={[styles.scootch, room]}>
          <Animated.View style={grown}>
            <Scootch
              mood={scootchMood(stage, props.stuck, props.twoMinutesLeft)}
              attitude={model.attitude}
              workMode={model.workMode}
              reducedMotion={model.reducedMotion}
              squashOnChange
              size={SCOOTCH.small}
              testID="session-scootch"
            />
          </Animated.View>
        </Animated.View>
      </PressSpring>
      <Animated.View {...reshape} style={[styles.pillRoom, smaller]}>
        <PressSpring
          accessibilityRole="button"
          accessibilityLabel={model.taskText}
          accessibilityHint={t(
            shape === 'title' ? 'session.catch.task.close.hint' : 'session.catch.task.open.hint',
          )}
          testID="session-pill"
          onPress={() => setShape((now) => (now === 'title' ? 'row' : 'title'))}
          answeredBy={glassPressOwner(true)}
        >
          <GlassSurface interactive style={styles.pill}>
            <View pointerEvents="none" style={styles.pillInner}>
              <PillDot inks={inks} />
              <Animated.View
                key={shape === 'title' ? 'whole' : 'line'}
                entering={arrive}
                exiting={leave}
                style={styles.fit}
              >
                <SessionText
                  face="pill"
                  color={inks.ink}
                  numberOfLines={shape === 'title' ? 3 : 1}
                  style={styles.fit}
                >
                  {model.taskText}
                </SessionText>
              </Animated.View>
            </View>
          </GlassSurface>
        </PressSpring>
      </Animated.View>
      {!timeShown ? null : (
        <Animated.View {...reshape} entering={arrive} exiting={leave}>
          {stage === 'waiting' ? (
            <PressSpring
              accessibilityRole="button"
              accessibilityLabel={corner}
              accessibilityHint={t('session.catch.didIt.hint')}
              testID="session-catch-did-it"
              feedback="primary"
              onPress={props.onDidIt}
              style={[styles.timer, { backgroundColor: inks.tomato }]}
            >
              <SessionText face="pill" color={inks.onTomato} numberOfLines={1}>
                {corner}
              </SessionText>
            </PressSpring>
          ) : counting ? (
            <PressSpring
              accessibilityRole="button"
              accessibilityLabel={
                showsEnd ? corner : t('session.minutesLeftSpoken', { count: model.minutesLeft })
              }
              accessibilityHint={t('session.catch.timer.hint')}
              onPress={() => setShowsEnd((shown) => !shown)}
              feedback="choice"
              testID="session-catch-timer"
            >
              <GlassSurface style={styles.timer}>
                <View pointerEvents="none">
                  <SessionText
                    face="pill"
                    color={inks.ink}
                    numberOfLines={1}
                    style={styles.figures}
                  >
                    {corner}
                  </SessionText>
                </View>
              </GlassSurface>
            </PressSpring>
          ) : (
            <View
              style={[styles.timer, { backgroundColor: inks.tomato }]}
              testID="session-catch-timer"
            >
              <SessionText face="pill" color={inks.onTomato} numberOfLines={1}>
                {corner}
              </SessionText>
            </View>
          )}
        </Animated.View>
      )}
      {props.hasMenu ? (
        <Animated.View {...reshape}>
          <GlassRound
            label={t('session.menu')}
            hint={t('session.menu.hint')}
            testID="session-menu"
            onPress={props.onMenu}
          >
            <MoreIcon color={inks.ink} />
          </GlassRound>
        </Animated.View>
      ) : stage === 'ready' ? (
        <RoundButton
          label={t('session.finish.keepGoing')}
          hint={t('session.finish.keepGoing.hint')}
          testID="session-keep-going"
          inks={inks}
          onPress={actions.keepGoing}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  scootch: { marginVertical: -2, alignItems: 'center', justifyContent: 'center' },
  // The task's pill gives way before the time and the corner control do, and steps back towards
  // the time when Scootch comes up.
  pillRoom: { flex: 1, minWidth: 0, transformOrigin: 'right center' },
  pill: {
    minHeight: ROW,
    borderRadius: ROW / 2,
    paddingHorizontal: 14,
    paddingVertical: 8,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pillInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fit: { flexShrink: 1 },
  timer: {
    minHeight: 40,
    borderRadius: 20,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  figures: { fontVariant: ['tabular-nums'] },
});
