import type { RefObject } from 'react';
import { StyleSheet } from 'react-native';

import { Dock, DockButton } from '../ui/dock';
import { GlassPill, PillPlus } from '../ui/glass-pill';
import { LeaveAsk } from '../ui/leave-ask';
import { ParkComposer, type ParkComposerHandle } from '../ui/park-composer';
import { sessionClosing } from '../ui/park-draft';
import { StuckCard } from '../ui/stuck-card';

import type { ScreenProps } from './screen-props';

/**
 * What sits at the foot of the session at work. Running, it is the one glass pill, "Park a
 * thought", and for the last two minutes nothing at all; the stuck card and the park field take
 * its place when they are up. A serious task has its plain dock: stop, and done.
 */
export function WorkingFooter({
  model,
  actions,
  inks,
  t,
  park,
}: ScreenProps & { readonly park: RefObject<ParkComposerHandle | null> }) {
  const { view } = model;
  if (view.kind !== 'working') return null;
  if (model.leaveAsked) {
    return <LeaveAsk inks={inks} t={t} onStay={actions.stay} onNotFinished={actions.leaveNow} />;
  }
  if (model.parkOpen) {
    return (
      <ParkComposer
        inks={inks}
        t={t}
        onPark={actions.park}
        onCancel={actions.closePark}
        closing={sessionClosing(model.fraction, model.plannedMinutes)}
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
      <Dock>
        {view.timeUp ? (
          <DockButton
            tone="plain"
            label={t('session.notFinished')}
            hint={t('session.notFinished.hint')}
            testID="session-not-finished"
            inks={inks}
            onPress={() => actions.send({ type: 'not_finished' })}
          />
        ) : (
          <DockButton
            tone="plain"
            label={t('session.quiet.stop')}
            hint={t('session.quiet.stop.hint')}
            testID="session-quiet-stop"
            inks={inks}
            onPress={actions.leave}
          />
        )}
        <DockButton
          tone="ink"
          label={t('session.quiet.done')}
          hint={t('session.quiet.done.hint')}
          testID="session-quiet-done"
          inks={inks}
          onPress={() => actions.send({ type: 'finish_tapped' })}
        />
      </Dock>
    );
  }
  // The last two minutes are for the finish: the board draws no pill under the warning.
  if (view.twoMinutesLeft) return null;
  return (
    <GlassPill
      label={t('talk.parkThought')}
      hint={t('session.park.hint')}
      testID="session-park"
      inks={inks}
      onPress={actions.openPark}
      lead={<PillPlus inks={inks} />}
      style={styles.park}
    />
  );
}

const styles = StyleSheet.create({
  park: {
    alignSelf: 'center',
  },
});
