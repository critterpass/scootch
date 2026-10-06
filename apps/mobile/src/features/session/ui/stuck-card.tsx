import { StyleSheet, View } from 'react-native';

import { radius, spacing } from '@scootch/tokens';

import type { Translate } from '../../../i18n/i18n-provider';

import { FilledButton, TextButton } from './controls';
import type { SessionInks } from './session-inks';
import { SessionText } from './session-text';

export interface StuckCardProps {
  /** The check-in's own words, when the card came up by itself. */
  readonly lead: string | null;
  /** The tiny next step, from the store. */
  readonly step: string | null;
  readonly inks: SessionInks;
  readonly t: Translate;
  readonly onSmaller: () => void;
  readonly onOkay: () => void;
}

/** Stuck help: one tiny next step, with "Smaller" and "Okay". Asked for or offered, it is the same card. */
export function StuckCard({ lead, step, inks, t, onSmaller, onOkay }: StuckCardProps) {
  return (
    <View testID="session-stuck-card" style={[styles.card, { backgroundColor: inks.surface }]}>
      <SessionText face="eyebrow" color={inks.muted}>
        {t('session.step.title')}
      </SessionText>
      {lead ? (
        <SessionText face="body" color={inks.muted}>
          {lead}
        </SessionText>
      ) : null}
      {step ? (
        <SessionText
          face="action"
          color={inks.ink}
          accessibilityLiveRegion="polite"
          testID="session-tiny-step"
        >
          {step}
        </SessionText>
      ) : null}
      <View style={styles.row}>
        <TextButton
          strong
          label={t('monster.smaller')}
          hint={t('session.step.smaller.hint')}
          testID="session-step-smaller"
          inks={inks}
          onPress={onSmaller}
          style={styles.half}
        />
        <FilledButton
          label={t('session.step.okay')}
          hint={t('session.step.okay.hint')}
          testID="session-step-okay"
          inks={inks}
          onPress={onOkay}
          style={styles.half}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  half: {
    flexGrow: 1,
    flexBasis: 120,
  },
});
