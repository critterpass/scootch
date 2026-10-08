import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { spacing } from '@scootch/tokens';

import { BurstMarks } from '../ui/burst-marks';
import { Characters } from '../ui/characters';
import { Stage, Words } from '../ui/drawn-parts';
import { RoundButton, TextButton } from '../ui/controls';
import { SessionFrame } from '../ui/session-frame';
import { SessionText } from '../ui/session-text';

import { HoldFinishBlock, useBurstFrom, useHoldFinish } from './hold-finish';
import type { ScreenProps } from './screen-props';

/** How long the catch plays before a tap anywhere may pass it. */
const PASS_AFTER_MS = 400;

/**
 * Time is up, or the person is done early, and the monster cannot be caught by hand here:
 * Scootch's line and the hold to finish. Holding fills the ring and letting go drains it with a
 * kind word. "Not finished" sits beside finishing once time is up.
 *
 * The same screen then plays the catch: the burst goes up from the control, its label reads
 * "Done", Scootch celebrates and the monster is caught. It passes by itself; a tap anywhere passes
 * it sooner. The finish's own sound and tap were played by the finish and are not played again.
 */
export function FinishScreen(props: ScreenProps) {
  const { model, actions, inks, t } = props;
  const { view } = model;
  const timeUp = view.kind === 'finish' && view.timeUp;
  const caught = view.kind === 'caught';
  // The catch plays on the screen the finish was made on: "Not finished" keeps its room under the
  // control, unseen, so nothing moves under the finger as the burst goes up.
  const wasTimeUp = useRef(timeUp);
  if (view.kind === 'finish') wasTimeUp.current = view.timeUp;
  const keepsRow = caught && wasTimeUp.current;
  // A tap anywhere passes the catch, but not the tail of the hold that made the finish.
  const [mayPass, setMayPass] = useState(false);
  useEffect(() => {
    if (!caught) return setMayPass(false);
    const timer = setTimeout(() => setMayPass(true), PASS_AFTER_MS);
    return () => clearTimeout(timer);
  }, [caught]);
  const finish = useHoldFinish(props);
  const burstFrom = useBurstFrom(finish);

  return (
    <SessionFrame
      inks={inks}
      testID="session-finish-hold"
      align="drawn"
      corner={
        // Nothing to go back to once time is up, or once the thing is caught.
        timeUp || caught ? null : (
          <RoundButton
            label={t('session.finish.keepGoing')}
            hint={t('session.finish.keepGoing.hint')}
            testID="session-keep-going"
            inks={inks}
            onPress={actions.keepGoing}
          />
        )
      }
      over={
        caught ? (
          <>
            {burstFrom === undefined ? null : (
              <BurstMarks
                kind="catch"
                inks={inks}
                reducedMotion={model.reducedMotion}
                controlAt={burstFrom}
              />
            )}
            {mayPass ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('session.skip')}
                accessibilityHint={t('session.skip.hint')}
                testID="session-caught-pass"
                onPress={actions.passCaught}
                style={StyleSheet.absoluteFill}
              />
            ) : null}
          </>
        ) : null
      }
      footer={
        <View style={styles.footer}>
          <HoldFinishBlock finish={finish} inks={inks} t={t} />
          {timeUp || keepsRow ? (
            // Set apart from the finish control, so reaching for one does not land on the other.
            <View
              style={[styles.apart, keepsRow ? styles.unseen : null]}
              pointerEvents={keepsRow ? 'none' : 'auto'}
              accessibilityElementsHidden={keepsRow}
              importantForAccessibility={keepsRow ? 'no-hide-descendants' : 'auto'}
            >
              <TextButton
                label={t('session.notFinished')}
                hint={t('session.notFinished.hint')}
                testID="session-not-finished"
                inks={inks}
                onPress={() => actions.send({ type: 'not_finished' })}
              />
            </View>
          ) : null}
        </View>
      }
    >
      <Stage height={250} top={16}>
        <Characters
          mood={finish.scootchMood}
          monsterMood={finish.monsterMood}
          attitude={model.attitude}
          monster={model.monster}
          reducedMotion={model.reducedMotion}
        />
      </Stage>
      {model.line ? (
        <Words top={6}>
          <SessionText
            face="line"
            color={inks.ink}
            accessibilityLiveRegion="polite"
            testID="session-finish-line"
          >
            {model.line.text}
          </SessionText>
        </Words>
      ) : null}
    </SessionFrame>
  );
}

const styles = StyleSheet.create({
  // The board's hold block ends 44 points from the foot.
  footer: {
    alignItems: 'stretch',
    paddingBottom: 10,
  },
  unseen: {
    opacity: 0,
  },
  // The caption's own 22 points, and a step more.
  apart: {
    marginTop: spacing.lg + 22,
  },
});
