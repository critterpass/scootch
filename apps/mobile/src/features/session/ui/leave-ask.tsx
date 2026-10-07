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
  readonly onLeave: () => void;
}

/**
 * The close control, pressed while the session runs: leaving is asked about before anything
 * changes. The timer keeps running behind the question, and "Keep going" is the filled action.
 */
export function LeaveAsk({ inks, t, onStay, onLeave }: LeaveAskProps) {
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
        label={t('session.leaveAsk.leave')}
        hint={t('session.leaveAsk.leave.hint')}
        testID="session-leave-now"
        inks={inks}
        onPress={onLeave}
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
