import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition, ReduceMotion } from 'react-native-reanimated';

import { Monster, type MonsterProps } from '../../../art/Monster';
import { Scootch } from '../../../art/Scootch';
import { RoundButton as GlassRound } from '../../../ui/buttons';
import { glassPressOwner, GlassSurface } from '../../../ui/glass-surface';
import { MoreIcon } from '../../../ui/icons';
import { SPRING_CURVE } from '../../../ui/motion/motion-tokens';
import { PressSpring } from '../../../ui/motion/press-spring';
import { shortName } from '../../monster/monster-name';
import type { ScreenProps, SessionFace } from '../screens/screen-props';
import { RoundButton } from '../ui/controls';
import { PillDot } from '../ui/pill-marks';
import { SessionText } from '../ui/session-text';

import { clockLeft, endsAtClock, type CatchStage } from './catch-flow';

/** The corner row's height. */
export const ROW = 44;
/** Whoever sits in the corner, in points: a little taller than the row, so it stands on it. */
export const CORNER_SEAT = 48;
/** How long the row takes to change shape, on the boards' soft-landing curve. */
const SHAPE_MS = 420;
const WORDS_MS = 220;
/** How long the pill shows the monster's whole name and title after a tap. */
const FULL_NAME_MS = 4000;

/**
 * The shapes the row takes. `row` is as the board draws it: the pill, and the time beside it.
 * `title` gives the pill the time's room too, so a long task or a whole name can be read.
 */
type RowShape = 'row' | 'title';

/** Whether one of the two is in the corner, and whether they are there to be seen yet. */
export type Seated = 'seen' | 'unseen' | 'away';

export interface CatchTopRowProps extends ScreenProps {
  readonly stage: CatchStage;
  /** Who the screen is about. The other one sits in the corner, and a tap there swaps them. */
  readonly face: SessionFace;
  /** Who is drawn in the corner. Mid-swap both are, unseen, so each is ready where it lands. */
  readonly seats: { readonly scootch: Seated; readonly monster: Seated };
  /** How the monster takes the moment, from its corner. */
  readonly monsterMood: NonNullable<MonsterProps['mood']>;
  /** The session is on the stuck card, or in its last two minutes: Scootch shows it. */
  readonly stuck: boolean;
  readonly twoMinutesLeft: boolean;
  /** There is a corner menu at this stage. */
  readonly hasMenu: boolean;
  readonly onMenu: () => void;
  /** "I did it", pressed after a "Not yet". */
  readonly onDidIt: () => void;
  /** A tap on whoever sits in the corner. */
  readonly onSwap: () => void;
}

/** How Scootch, small in the corner, takes each moment of a catch. */
export function scootchMood(stage: CatchStage, stuck: boolean, twoMinutesLeft: boolean) {
  if (stage === 'caught') return 'celebrating';
  if (stage === 'asking' || stage === 'ready') return 'nudge';
  if (stage === 'coach') return 'waiting';
  if (stuck) return 'stuck';
  return twoMinutesLeft ? 'shocked' : 'working';
}

/**
 * The top of a session whose monster can be caught: whoever is not filling the screen, small in
 * the corner; a pill; the time left, which turns into what the moment asks ("Time's up", "I did
 * it", "Done", "Caught"); and the corner control.
 *
 * With the catch on the screen Scootch has the corner and the pill carries the task. With Scootch
 * at work the monster has the corner and the pill is its name tag, while the time is told by his
 * disc. A tap on the corner swaps the two. A tap on the pill opens it to show the task or the name
 * whole, taking the time's room, and closes it again. The time, while it counts, turns between how
 * long is left and when it ends. Nothing here starts, stops or changes the session.
 */
export function CatchTopRow(props: CatchTopRowProps) {
  const { model, actions, inks, t, stage, face, seats } = props;
  const [shape, setShape] = useState<RowShape>('row');
  const [showsEnd, setShowsEnd] = useState(false);
  // The pill starts over with whoever it is about, and a whole name goes back to a short one.
  useEffect(() => setShape('row'), [face]);
  const named = face === 'scootch' && shape === 'title';
  useEffect(() => {
    if (!named) return undefined;
    const timer = setTimeout(() => setShape('row'), FULL_NAME_MS);
    return () => clearTimeout(timer);
  }, [named]);
  const { view } = model;
  const counting = stage === 'setting' || stage === 'coach';
  const left = stage === 'coach' ? 1 : model.fraction;
  const atWork = face === 'scootch';
  // With Scootch at work his disc tells the time, and the hold asks nothing first: the corner
  // only says that time is up, and that the monster is caught.
  const corner = atWork
    ? view.kind === 'caught'
      ? t('session.catch.caught')
      : t('session.catch.timeUp')
    : stage === 'asking'
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
  const timeShown = atWork
    ? view.kind === 'caught' || (view.kind === 'finish' && view.timeUp)
    : !(counting && shape === 'title');
  const name = model.monster?.name ?? '';
  const pillText = atWork
    ? shape === 'title'
      ? name
      : t('session.pill', { name: shortName(name), minutes: model.plannedMinutes })
    : model.taskText;

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
        accessibilityLabel={atWork ? name : t('brand.name')}
        accessibilityHint={t(
          atWork ? 'session.catch.swap.toMonster.hint' : 'session.catch.swap.toScootch.hint',
        )}
        onPress={props.onSwap}
        feedback="choice"
        hitSlop={6}
        testID="session-scootch-button"
      >
        <View pointerEvents="none" style={styles.seat}>
          {seats.scootch === 'away' ? null : (
            <View style={[styles.seated, seats.scootch === 'unseen' ? styles.unseen : null]}>
              <Scootch
                mood={scootchMood(stage, props.stuck, props.twoMinutesLeft)}
                attitude={model.attitude}
                workMode={model.workMode}
                reducedMotion={model.reducedMotion}
                squashOnChange
                size={CORNER_SEAT}
                testID="session-scootch"
              />
            </View>
          )}
          {seats.monster === 'away' || !model.monster ? null : (
            <View style={[styles.seated, seats.monster === 'unseen' ? styles.unseen : null]}>
              <Monster
                spec={model.monster.spec}
                idle
                mood={props.monsterMood}
                squashOnChange
                reducedMotion={model.reducedMotion}
                size={CORNER_SEAT}
                testID="session-corner-monster"
              />
            </View>
          )}
        </View>
      </PressSpring>
      <Animated.View {...reshape} style={styles.pillRoom}>
        <PressSpring
          accessibilityRole="button"
          accessibilityLabel={atWork ? name : model.taskText}
          accessibilityHint={t(
            atWork
              ? 'session.pill.hint'
              : shape === 'title'
                ? 'session.catch.task.close.hint'
                : 'session.catch.task.open.hint',
          )}
          testID="session-pill"
          onPress={() => setShape((now) => (now === 'title' ? 'row' : 'title'))}
          answeredBy={glassPressOwner(true)}
        >
          <GlassSurface interactive style={styles.pill}>
            <View pointerEvents="none" style={styles.pillInner}>
              <PillDot inks={inks} />
              <Animated.View
                key={`${face}-${shape}`}
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
                  {pillText}
                </SessionText>
              </Animated.View>
            </View>
          </GlassSurface>
        </PressSpring>
      </Animated.View>
      {!timeShown ? null : (
        <Animated.View {...reshape} entering={arrive} exiting={leave}>
          {!atWork && stage === 'waiting' ? (
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
          ) : !atWork && counting ? (
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
      ) : view.kind === 'finish' ? (
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
  seat: { width: CORNER_SEAT, height: CORNER_SEAT, marginVertical: (ROW - CORNER_SEAT) / 2 },
  seated: { position: 'absolute', left: 0, top: 0 },
  unseen: { opacity: 0 },
  // The pill gives way before the time and the corner control do.
  pillRoom: { flex: 1, minWidth: 0 },
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
