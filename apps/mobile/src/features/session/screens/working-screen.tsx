import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { radius, spacing } from '@scootch/tokens';

import { Scootch } from '../../../art/Scootch';
import { DEVELOPER_END } from '../dev/short-session';
import { companyLine } from '../session-view';
import { Capsule, FilledButton, RoundButton, Tag, TextButton } from '../ui/controls';
import { LeaveAsk } from '../ui/leave-ask';
import { ParkComposer } from '../ui/park-composer';
import { ParkedToast } from '../ui/parked-toast';
import { SessionFrame } from '../ui/session-frame';
import { SessionText } from '../ui/session-text';
import { StuckCard } from '../ui/stuck-card';
import { TimeDisc } from '../ui/time-disc';

import type { ScreenProps } from './screen-props';

const DISC_MAX = 280;
const DISC_SHARE = 0.24;
const SCOOTCH_SHARE = 0.15;

function Footer({ model, actions, inks, t }: ScreenProps) {
  const { view } = model;
  if (view.kind !== 'working') return null;
  if (model.leaveAsked) {
    return <LeaveAsk inks={inks} t={t} onStay={actions.stay} onLeave={actions.leaveNow} />;
  }
  if (model.parkOpen) {
    return <ParkComposer inks={inks} t={t} onPark={actions.park} onCancel={actions.closePark} />;
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
      <View style={[styles.bar, { backgroundColor: inks.surface }]}>
        {view.timeUp ? (
          <TextButton
            strong
            label={t('session.notFinished')}
            hint={t('session.notFinished.hint')}
            testID="session-not-finished"
            inks={inks}
            onPress={() => actions.send({ type: 'not_finished' })}
            style={styles.half}
          />
        ) : (
          <TextButton
            strong
            label={t('session.quiet.stop')}
            hint={t('session.quiet.stop.hint')}
            testID="session-quiet-stop"
            inks={inks}
            onPress={actions.leave}
            style={styles.half}
          />
        )}
        <FilledButton
          label={t('session.quiet.done')}
          hint={t('session.quiet.done.hint')}
          testID="session-quiet-done"
          inks={inks}
          onPress={() => actions.send({ type: 'finish_tapped' })}
          style={styles.half}
        />
      </View>
    );
  }
  return (
    <>
      <Capsule
        label={t('talk.parkThought')}
        hint={t('session.park.hint')}
        testID="session-park"
        inks={inks}
        onPress={actions.openPark}
        style={styles.park}
        lead={
          <SessionText face="action" color={inks.ink}>
            +
          </SessionText>
        }
      />
      <View style={styles.quietRow}>
        <TextButton
          label={t('session.stuck')}
          hint={t('session.stuck.hint')}
          testID="session-stuck"
          inks={inks}
          onPress={() => actions.send({ type: 'stuck_tapped' })}
        />
        <TextButton
          label={t('session.finishEarly')}
          hint={t('session.finishEarly.hint')}
          testID="session-finish-early"
          inks={inks}
          onPress={actions.finishEarly}
        />
        {model.developerEnd ? (
          <TextButton
            label={DEVELOPER_END.label}
            hint={DEVELOPER_END.hint}
            testID="session-developer-end"
            inks={inks}
            onPress={actions.developerEnd}
          />
        ) : null}
      </View>
    </>
  );
}

/**
 * The session at work: time as a shrinking disc, the minutes, the task, and Scootch working beside
 * it. Parking a thought, stuck help and the two-minute warning all happen here, and a serious
 * task's whole session does, in ink-grey and plain words.
 */
export function WorkingScreen(props: ScreenProps) {
  const { model, actions, inks, t } = props;
  const { width, height } = useWindowDimensions();
  if (model.view.kind !== 'working') return null;
  const { quiet, stuck, timeUp, twoMinutesLeft } = model.view;
  // The disc and Scootch share the screen with the task and Scootch's line, which may run to
  // three lines: both give way on a short screen so the line is never pushed under the buttons.
  const discSize =
    Math.min(DISC_MAX, width - spacing.lg * 2, height * DISC_SHARE) *
    (stuck || model.parkOpen ? 0.7 : 1);
  const scootchSize = stuck || model.parkOpen ? 96 : Math.min(140, height * SCOOTCH_SHARE);
  const name = model.monster?.name;
  const spoken = timeUp
    ? t('session.timeUpSpoken')
    : t('session.minutesLeftSpoken', { count: model.minutesLeft });
  const line = companyLine(model.line);
  // He acts the moment: stuck with you, a small wave for a parked thought, shocked at the clock.
  const mood = quiet
    ? 'serious'
    : stuck
      ? 'stuck'
      : model.parkedNote
        ? 'nudge'
        : twoMinutesLeft
          ? 'shocked'
          : 'working';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.fill}
    >
      <SessionFrame
        inks={inks}
        testID={quiet ? 'session-quiet' : 'session-running'}
        footer={<Footer {...props} />}
        over={
          model.parkedNote ? (
            <ParkedToast
              thought={model.parkedNote}
              title={t('session.park.parked')}
              detail={t('session.park.seeItAfter', { thought: model.parkedNote })}
              inks={inks}
            />
          ) : null
        }
        top={
          <>
            {quiet ? (
              <View />
            ) : (
              <Tag
                inks={inks}
                label={
                  name
                    ? t('session.pill', { name, minutes: model.plannedMinutes })
                    : t('session.pillPlain', { minutes: model.plannedMinutes })
                }
              />
            )}
            <RoundButton
              label={t('session.leave')}
              hint={t('session.leave.hint')}
              testID="session-leave"
              inks={inks}
              onPress={actions.leave}
            />
          </>
        }
      >
        <TimeDisc
          fraction={model.fraction}
          quiet={quiet}
          size={discSize}
          inks={inks}
          reducedMotion={model.reducedMotion}
          spokenLabel={spoken}
          hint={t('session.discHint')}
        />
        <Scootch
          mood={mood}
          attitude={model.attitude}
          workMode={model.workMode}
          reducedMotion={model.reducedMotion}
          squashOnChange
          size={scootchSize}
          testID="session-scootch"
        />
        <SessionText face="minutes" color={inks.ink} testID="session-minutes" accessible={false}>
          {t('session.minutesLeft', { count: model.minutesLeft })}
        </SessionText>
        {quiet ? null : (
          <SessionText face="body" color={inks.muted} testID="session-task" style={styles.centred}>
            {model.taskText}
          </SessionText>
        )}
        {line ? (
          <SessionText
            face="body"
            color={quiet ? inks.muted : inks.ink}
            accessibilityLiveRegion="polite"
            testID="session-line"
            style={styles.centred}
          >
            {line}
          </SessionText>
        ) : null}
      </SessionFrame>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  bar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    borderRadius: radius.lg,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  half: {
    flexGrow: 1,
    flexBasis: 120,
  },
  park: {
    alignSelf: 'center',
  },
  quietRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  strong: {
    fontWeight: '600',
  },
  centred: {
    textAlign: 'center',
  },
});
