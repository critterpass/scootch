import { StyleSheet, View } from 'react-native';

import type { SentMode } from '@scootch/domain';
import type { StringKey } from '@scootch/i18n';
import { spacing } from '@scootch/tokens';

import { useT } from '../../i18n/i18n-provider';
import { CapsuleButton } from '../../ui/buttons';
import { Sheet } from '../../ui/sheet/sheet';
import { useScreenStyle } from '../../ui/use-screen-style';
import { SessionText } from '../session/ui/session-text';

export interface ConsentSheetProps {
  readonly open: boolean;
  readonly mode: SentMode;
  /** "Read it": the words on this photo, and on later ones, may be sent to be read. */
  readonly onReadIt: () => void;
  /** "Not now", a drag down or a tap outside: nothing is sent. */
  readonly onNotNow: () => void;
}

const ROWS = [
  ['camera.consent.sent', 'camera.consent.sent.value'],
  ['camera.consent.photo', 'camera.consent.photo.value'],
  ['camera.consent.kept', 'camera.consent.kept.value'],
  ['camera.consent.trained', 'camera.consent.trained.value'],
  ['camera.consent.others', 'camera.consent.others.value'],
] as const satisfies readonly (readonly [StringKey, StringKey])[];

/**
 * Asked before the first Paper or Screen read leaves the phone: what is sent, what is not, and
 * what happens to it, in plain words. Both answers are buttons of the same size; neither is
 * pressed for the person.
 */
export function ConsentSheet({ open, mode, onReadIt, onNotNow }: ConsentSheetProps) {
  const t = useT();
  const { palette, largeText } = useScreenStyle();
  return (
    <Sheet
      open={open}
      onClose={onNotNow}
      testID="camera-consent"
      header={
        <SessionText face="step" color={palette.ink} accessibilityRole="header">
          {t(mode === 'paper' ? 'camera.consent.title.paper' : 'camera.consent.title.screen')}
        </SessionText>
      }
    >
      <View style={styles.rows}>
        {ROWS.map(([name, value]) => (
          <View key={name} style={largeText ? styles.rowStacked : styles.row}>
            <SessionText face="caption" color={palette.muted} style={styles.name}>
              {t(name)}
            </SessionText>
            <SessionText face="body" color={palette.ink} style={styles.value}>
              {t(value)}
            </SessionText>
          </View>
        ))}
      </View>
      <View style={largeText ? styles.answersStacked : styles.answers}>
        <CapsuleButton
          tone="quiet"
          label={t('camera.consent.notNow')}
          hint={t('camera.consent.notNow.hint')}
          onPress={onNotNow}
          testID="camera-consent-not-now"
          style={largeText ? undefined : styles.answer}
        />
        <CapsuleButton
          label={t('camera.consent.readIt')}
          hint={t('camera.consent.readIt.hint')}
          onPress={onReadIt}
          testID="camera-consent-read-it"
          style={largeText ? undefined : styles.answer}
        />
      </View>
      <SessionText face="note" color={palette.muted} style={styles.change}>
        {t('camera.consent.change')}
      </SessionText>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  rows: { gap: spacing.md, paddingVertical: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
  rowStacked: { gap: spacing.xs },
  name: { width: 96 },
  value: { flexShrink: 1, flexGrow: 1 },
  answers: { flexDirection: 'row', gap: spacing.sm },
  answersStacked: { gap: spacing.sm },
  answer: { flexGrow: 1, flexBasis: 0 },
  change: { textAlign: 'center', paddingTop: spacing.md },
});
