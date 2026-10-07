import { StyleSheet, View } from 'react-native';

import { Scootch } from '../../../art/Scootch';
import { GlassTag, RoundButton as GlassRound } from '../../../ui/buttons';
import { GlassSurface } from '../../../ui/glass-surface';
import { MoreIcon } from '../../../ui/icons';
import { PressSpring } from '../../../ui/motion/press-spring';
import type { ScreenProps } from '../screens/screen-props';
import { RoundButton } from '../ui/controls';
import { PillDot } from '../ui/pill-marks';
import { SessionText } from '../ui/session-text';

import { clockLeft, type CatchStage } from './catch-flow';

/** The corner row's height. */
export const ROW = 44;

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
 */
export function CatchTopRow(props: CatchTopRowProps) {
  const { model, actions, inks, t, stage } = props;
  const corner =
    stage === 'asking'
      ? t('session.catch.timeUp')
      : stage === 'waiting'
        ? t('session.catch.didIt')
        : stage === 'ready'
          ? t('session.catch.unlocked')
          : stage === 'caught'
            ? t('session.catch.caught')
            : clockLeft(stage === 'coach' ? 1 : model.fraction, model.plannedMinutes);
  const counting = stage === 'setting' || stage === 'coach';
  return (
    <>
      <View pointerEvents="none" style={styles.scootch}>
        <Scootch
          mood={scootchMood(stage, props.stuck, props.twoMinutesLeft)}
          attitude={model.attitude}
          workMode={model.workMode}
          reducedMotion={model.reducedMotion}
          squashOnChange
          size={48}
          testID="session-scootch"
        />
      </View>
      <GlassTag testID="session-pill" style={styles.pill}>
        <PillDot inks={inks} />
        <SessionText face="pill" color={inks.ink} numberOfLines={1} style={styles.fit}>
          {model.taskText}
        </SessionText>
      </GlassTag>
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
        <GlassSurface style={styles.timer} testID="session-catch-timer">
          <SessionText
            face="pill"
            color={inks.ink}
            numberOfLines={1}
            accessibilityLabel={t('session.minutesLeftSpoken', { count: model.minutesLeft })}
            style={styles.figures}
          >
            {corner}
          </SessionText>
        </GlassSurface>
      ) : (
        <View style={[styles.timer, { backgroundColor: inks.tomato }]} testID="session-catch-timer">
          <SessionText face="pill" color={inks.onTomato} numberOfLines={1}>
            {corner}
          </SessionText>
        </View>
      )}
      {props.hasMenu ? (
        <GlassRound
          label={t('session.menu')}
          hint={t('session.menu.hint')}
          testID="session-menu"
          onPress={props.onMenu}
        >
          <MoreIcon color={inks.ink} />
        </GlassRound>
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
  scootch: { width: 48, height: 48, marginVertical: -2 },
  // The task's pill gives way before the time and the corner control do.
  pill: { flex: 1, minWidth: 0, justifyContent: 'flex-start', paddingHorizontal: 14 },
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
