import type { RefObject } from 'react';
import { StyleSheet } from 'react-native';

import { CapsuleButton, DOCK_PADDING, GlassDock } from '../../../ui/buttons';

import { ParkComposer, type ParkComposerHandle } from '../ui/park-composer';
import { ParkPill } from '../ui/park-pill';
import { StuckCard } from '../ui/stuck-card';

import { OthersHuntingLine, useOthersHuntingWatch } from './others-hunting-line';
import type { ScreenProps } from './screen-props';

/**
 * What sits at the foot of the session at work. Running, it is the one glass pill, "Park a
 * thought", with how many others are hunting over it when that is shown, and for the last two
 * minutes nothing at all; the stuck card and the park field take
 * its place when they are up. A serious task has its plain dock: stop, and done.
 */
export function WorkingFooter({
  model,
  actions,
  inks,
  t,
  park,
}: ScreenProps & { readonly park: RefObject<ParkComposerHandle | null> }) {
  useOthersHuntingWatch();
  const { view } = model;
  if (view.kind !== 'working') return null;
  if (model.parkOpen) {
    return (
      <ParkComposer
        inks={inks}
        t={t}
        onPark={actions.park}
        onCancel={actions.closePark}
        handle={park}
      />
    );
  }
  if (view.stuck) {
    return (
      <StuckCard
        lead={model.line?.slot === 'checkIn' ? model.line.text : null}
        step={model.tinyNextStep}
        inks={inks}
        t={t}
        onSmaller={() => actions.send({ type: 'step_smaller' })}
        onOkay={() => actions.send({ type: 'step_accepted' })}
      />
    );
  }
  if (view.quiet) {
    // A serious task: a plain tap finishes, and stopping sits beside it. Nothing else is offered.
    return (
      <GlassDock style={styles.dock}>
        {view.timeUp ? (
          <CapsuleButton
            tone="quiet"
            style={styles.half}
            label={t('session.notFinished')}
            hint={t('session.notFinished.hint')}
            testID="session-not-finished"
            onPress={() => actions.send({ type: 'not_finished' })}
          />
        ) : (
          <CapsuleButton
            tone="quiet"
            style={styles.half}
            label={t('session.quiet.stop')}
            hint={t('session.quiet.stop.hint')}
            testID="session-quiet-stop"
            onPress={actions.leave}
          />
        )}
        <CapsuleButton
          tone="ink"
          style={styles.half}
          label={t('session.quiet.done')}
          hint={t('session.quiet.done.hint')}
          testID="session-quiet-done"
          onPress={() => actions.send({ type: 'finish_tapped' })}
        />
      </GlassDock>
    );
  }
  // The last two minutes are for the finish: the board draws no pill under the warning.
  if (view.twoMinutesLeft) return null;
  // In flow at the foot, the pill leaves at once and the field takes its room; back from the
  // field it settles out of the field's width.
  return (
    <>
      <OthersHuntingLine inks={inks} t={t} />
      <ParkPill inks={inks} t={t} onPress={actions.openPark} back />
    </>
  );
}

const styles = StyleSheet.create({
  dock: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: DOCK_PADDING,
  },
  half: {
    flexGrow: 1,
    flexBasis: 120,
  },
});
