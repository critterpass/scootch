import type { ComponentRef, Ref } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { Scootch, type ScootchProps } from '../../../art/Scootch';
import { companyLine, scootchShare } from '../session-view';
import { SessionText } from '../ui/session-text';
import { RING_SIZE, SMALL_RING_SIZE, TimeDisc } from '../ui/time-disc';

import type { HoldFinish } from './hold-finish';
import type { ScreenProps, SessionModel } from './screen-props';

/** The board's phone is 393 points wide and the ring 330: this much stays clear at the sides. */
const RING_MARGIN = 63;
/** The most of the screen's height the ring may take, so the time and the task stay on it. */
const RING_SHARE = 0.39;
/** The ring while the keyboard is up under the park field. */
const RING_BESIDE_KEYBOARD = 190;

/**
 * The ring's size on this phone. The board's is 330 across, and 280 for a serious task, beside
 * the stuck card and over the hold to finish.
 */
export function deskRing(facts: {
  readonly width: number;
  readonly height: number;
  readonly small: boolean;
  /** The park field is open over the keyboard. */
  readonly besideKeyboard: boolean;
}): number {
  return Math.min(
    facts.besideKeyboard ? RING_BESIDE_KEYBOARD : facts.small ? SMALL_RING_SIZE : RING_SIZE,
    facts.width - RING_MARGIN,
    facts.height * RING_SHARE,
  );
}

/**
 * How Scootch takes the moment on his disc: stuck with you, a small wave for a parked thought,
 * shocked at the clock, and over the hold whatever the hold makes of him. A serious task has him
 * asleep: there, and asking nothing.
 */
export function deskMood(model: SessionModel, finish: HoldFinish | null): ScootchProps['mood'] {
  if (finish) return finish.scootchMood;
  const working = model.view.kind === 'working' ? model.view : null;
  if (working?.quiet) return 'asleep';
  if (working?.stuck) return 'stuck';
  if (model.parkedNote) return 'nudge';
  return working?.twoMinutesLeft ? 'shocked' : 'working';
}

export interface WorkingDeskProps extends ScreenProps {
  /** The ring's width and height in points: see `deskRing`. */
  readonly ring: number;
  /** The hold to finish is at the foot: Scootch takes the hold as it goes, and says his line. */
  readonly finish?: HoldFinish | null;
  /** False leaves the time and the task off: the field and the keyboard have their room. */
  readonly words?: boolean;
  /** Scootch's own place on the disc, for whoever needs to know where he sits. */
  readonly scootchRef?: Ref<ComponentRef<typeof View>>;
  readonly scootchStyle?: ViewProps['style'];
}

/**
 * Scootch at work, as the board draws him: a ring with the tomato disc shrinking inside it and a
 * paper Scootch sitting on the disc, and under it the time and the task. A serious task's is
 * ink-grey, and he sleeps on it.
 */
export function WorkingDesk({
  model,
  inks,
  t,
  ring,
  finish = null,
  words = true,
  scootchRef,
  scootchStyle,
}: WorkingDeskProps) {
  const working = model.view.kind === 'working' ? model.view : null;
  const quiet = working?.quiet === true;
  const stuck = working?.stuck === true;
  const twoMinutesLeft = working?.twoMinutesLeft === true;
  const timeUp = working ? working.timeUp : model.fraction <= 0;

  // Scootch keeps his size against the ring he was drawn in, whatever the phone.
  const scootchSize = Math.round(
    stuck ? (180 / SMALL_RING_SIZE) * ring : scootchShare(model.fraction) * ring,
  );
  const spoken = timeUp
    ? t('session.timeUpSpoken')
    : t('session.minutesLeftSpoken', { count: model.minutesLeft });
  const line = companyLine(model.line);
  const mood = deskMood(model, finish);
  // Under the time there is one line, as every running frame draws it: the task. Scootch's words
  // take its place for the last two minutes, for a serious task, and for the moment a monster
  // hatches mid-session. His passing lines are for the Live Activity.
  const said = quiet || twoMinutesLeft || model.line?.slot === 'hatch' ? line : null;
  // A task with no monster yet keeps its own words, with his note about the hatch small under them.
  const note = !said && !quiet && model.monster === null ? line : null;

  return (
    <>
      <View style={quiet ? styles.quietRing : stuck ? styles.stuckRing : styles.ring}>
        <TimeDisc
          fraction={model.fraction}
          quiet={quiet}
          size={ring}
          inks={inks}
          reducedMotion={model.reducedMotion}
          spokenLabel={spoken}
          hint={t('session.discHint')}
        >
          <View ref={scootchRef} collapsable={false} style={scootchStyle}>
            <Scootch
              mood={mood}
              tone="paper"
              attitude={model.attitude}
              workMode={model.workMode}
              reducedMotion={model.reducedMotion}
              care={quiet ? 'serious' : 'none'}
              squashOnChange
              size={scootchSize}
              testID="session-scootch"
            />
          </View>
        </TimeDisc>
      </View>
      {stuck || !words ? null : finish ? (
        // Over the hold his line is all there is to read: the time is up, or no longer the point.
        <View style={styles.words}>
          {model.line ? (
            <SessionText
              face="line"
              color={inks.ink}
              numberOfLines={3}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              accessibilityLiveRegion="polite"
              testID="session-finish-line"
              style={styles.text}
            >
              {model.line.text}
            </SessionText>
          ) : null}
        </View>
      ) : (
        <View style={quiet ? styles.quietWords : styles.words}>
          <SessionText
            face={quiet ? 'quietTime' : 'time'}
            color={inks.ink}
            testID="session-minutes"
            accessible={false}
          >
            {t('session.minutesLeft', { count: model.minutesLeft })}
          </SessionText>
          {said ? (
            <SessionText
              face="task"
              color={inks.muted}
              accessibilityLiveRegion="polite"
              testID="session-line"
              style={styles.text}
            >
              {said}
            </SessionText>
          ) : quiet ? null : (
            <SessionText face="task" color={inks.muted} testID="session-task" style={styles.text}>
              {model.taskText}
            </SessionText>
          )}
          {note ? (
            <SessionText face="note" color={inks.muted} testID="session-note" style={styles.text}>
              {note}
            </SessionText>
          ) : null}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  // The board's gaps under its 52-point top row, less the four points the corner row lacks.
  ring: {
    marginTop: 34,
  },
  stuckRing: {
    marginTop: 18,
  },
  quietRing: {
    marginTop: 44,
  },
  words: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingHorizontal: 28,
    marginTop: 28,
    gap: 6,
    paddingBottom: 8,
  },
  quietWords: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingHorizontal: 28,
    marginTop: 24,
    gap: 6,
    paddingBottom: 8,
  },
  text: {
    textAlign: 'center',
  },
});
