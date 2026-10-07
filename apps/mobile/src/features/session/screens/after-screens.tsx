import { StyleSheet } from 'react-native';

import { Scootch } from '../../../art/Scootch';
import { BurstMarks } from '../ui/burst-marks';
import { Characters } from '../ui/characters';
import { FilledButton, RoundButton } from '../ui/controls';
import { InkDock, Stage, Words } from '../ui/drawn-parts';
import { SessionFrame } from '../ui/session-frame';
import { SessionText } from '../ui/session-text';

import type { ScreenProps } from './screen-props';

/** English reads "Claim the coffee" whether the treat was typed as "coffee" or "a coffee". */
export function treatName(treat: string): string {
  return treat.trim().replace(/^(a|an|the|my|some)\s+/i, '');
}

/**
 * The finish itself, when no treat was named: the caught line under the burst. A serious task
 * gets its plain line, with no burst and nothing celebrating.
 */
export function MomentScreen({ model, actions, inks, t }: ScreenProps) {
  const quiet = model.view.kind === 'moment' && model.view.quiet;
  return (
    <SessionFrame
      inks={inks}
      testID={quiet ? 'session-quiet-done-moment' : 'session-caught'}
      over={
        quiet ? null : (
          <BurstMarks kind="confetti" inks={inks} reducedMotion={model.reducedMotion} />
        )
      }
      footer={
        <FilledButton
          label={t('session.finish.done')}
          hint={t('session.finish.done.hint')}
          testID="session-moment-done"
          inks={inks}
          onPress={actions.passMoment}
        />
      }
    >
      <Characters
        mood={quiet ? 'serious' : 'celebrating'}
        attitude={model.attitude}
        monster={null}
        reducedMotion={model.reducedMotion}
      />
      {model.line ? (
        <SessionText
          face="headline"
          color={inks.ink}
          accessibilityLiveRegion="polite"
          testID="session-moment-line"
          style={styles.stretch}
        >
          {model.line.text}
        </SessionText>
      ) : null}
    </SessionFrame>
  );
}

/**
 * The treat named before starting, handed over with ceremony, as the board draws it: Scootch large
 * and celebrating, his ceremony line as the headline, and the treat itself in the one action.
 * One tap claims it; the corner skips.
 */
export function TreatScreen({ model, actions, inks, t }: ScreenProps) {
  const treat = model.view.kind === 'treat' ? model.view.treat : '';
  // The task's own ceremony line when its pack has one; otherwise what was last said.
  const said = model.treatLine ?? model.line?.text ?? null;
  return (
    <SessionFrame
      inks={inks}
      testID="session-treat"
      align="drawn"
      footerInset={14}
      over={<BurstMarks kind="confetti" inks={inks} reducedMotion={model.reducedMotion} />}
      top={
        <RoundButton
          label={t('session.skip')}
          hint={t('session.skip.hint')}
          testID="session-treat-skip"
          inks={inks}
          onPress={actions.passTreat}
        />
      }
      footer={
        <InkDock
          label={t('session.treat.claim', { treat: treatName(treat) })}
          hint={t('session.treat.claim.hint')}
          testID="session-treat-claim"
          onPress={actions.passTreat}
        />
      }
    >
      <Stage height={280} top={14}>
        <Scootch
          mood="celebrating"
          attitude={model.attitude}
          reducedMotion={model.reducedMotion}
          squashOnChange
          size={260}
        />
      </Stage>
      <Words top={8}>
        <SessionText face="eyebrow" color={inks.muted} accessibilityRole="header">
          {t('session.treat.title')}
        </SessionText>
        {said === null ? (
          <SessionText face="lineLarge" color={inks.ink} testID="session-treat-name">
            {treat}
          </SessionText>
        ) : (
          <SessionText face="lineLarge" color={inks.ink} testID="session-treat-line">
            {said}
          </SessionText>
        )}
      </Words>
    </SessionFrame>
  );
}

const styles = StyleSheet.create({
  stretch: {
    alignSelf: 'stretch',
  },
});
