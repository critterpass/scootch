import { StyleSheet, View } from 'react-native';

import { radius, spacing } from '@scootch/tokens';

import type { Translate } from '../../../i18n/i18n-provider';
import { RiseIn } from '../../../ui/motion/rise-in';

import { FilledButton, TextButton } from './controls';
import type { SessionInks } from './session-inks';
import { SessionText } from './session-text';

export interface LeaveAskProps {
  readonly inks: SessionInks;
  readonly t: Translate;
  readonly onStay: () => void;
  /** "I'm not finished": on to the calm choices (tomorrow, smaller, let it go). */
  readonly onNotFinished: () => void;
}

/**
 * The close control, pressed while the session runs: nothing ends by itself. The timer keeps
 * running behind the question, "Keep going" is the filled action and costs nothing, and "Not
 * finished" leads to the same calm choices as when time is up.
 */
export function LeaveAsk({ inks, t, onStay, onNotFinished }: LeaveAskProps) {
  return (
    <RiseIn style={[styles.card, { backgroundColor: inks.surface }]} testID="session-leave-ask">
      <View style={styles.words}>
        <SessionText face="action" color={inks.ink}>
          {t('session.leaveAsk')}
        </SessionText>
        <SessionText face="caption" color={inks.muted}>
          {t('session.leaveAsk.sub')}
        </SessionText>
      </View>
      <FilledButton
        label={t('session.leaveAsk.stay')}
        hint={t('session.leaveAsk.stay.hint')}
        testID="session-leave-stay"
        inks={inks}
        onPress={onStay}
      />
      <TextButton
        label={t('session.notFinished')}
        hint={t('session.notFinished.hint')}
        testID="session-leave-not-finished"
        inks={inks}
        onPress={onNotFinished}
      />
    </RiseIn>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  words: {
    gap: spacing.xs,
  },
});
