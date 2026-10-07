import { StyleSheet, View } from 'react-native';

import type { Translate } from '../../../i18n/i18n-provider';
import { CapsuleButton, DOCK_PADDING } from '../../../ui/buttons';
import { GlassSurface } from '../../../ui/glass-surface';
import { RiseIn } from '../../../ui/motion/rise-in';

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

/**
 * Stuck help: one tiny next step on a glass card, with "Smaller" and "Okay". Asked for or offered,
 * it is the same card, and it rises in from the foot of the screen.
 */
export function StuckCard({ lead, step, inks, t, onSmaller, onOkay }: StuckCardProps) {
  return (
    <RiseIn testID="session-stuck-card">
      <GlassSurface style={styles.card}>
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
            face="step"
            color={inks.ink}
            accessibilityLiveRegion="polite"
            testID="session-tiny-step"
          >
            {step}
          </SessionText>
        ) : null}
        <View style={styles.row}>
          <CapsuleButton
            tone="quiet"
            label={t('monster.smaller')}
            hint={t('session.step.smaller.hint')}
            testID="session-step-smaller"
            onPress={onSmaller}
            style={styles.half}
          />
          <CapsuleButton
            tone="ink"
            label={t('session.step.okay')}
            hint={t('session.step.okay.hint')}
            testID="session-step-okay"
            onPress={onOkay}
            style={styles.half}
          />
        </View>
      </GlassSurface>
    </RiseIn>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 36,
    paddingTop: 22,
    paddingHorizontal: 20,
    paddingBottom: 14,
    gap: 10,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: DOCK_PADDING,
    marginTop: 8,
  },
  half: {
    flexGrow: 1,
    flexBasis: 120,
  },
});
