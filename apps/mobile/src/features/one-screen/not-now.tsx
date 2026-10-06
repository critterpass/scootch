import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { fonts, radius, spacing } from '@scootch/tokens';

import { useT } from '../../i18n/i18n-provider';
import { CapsuleButton } from '../../ui/buttons';
import { useScreenStyle } from '../../ui/use-screen-style';
import { QuietLink } from '../dump/dump-panels';

const INPUT_SIZE = 17;
const EXCUSE_MAX = 80;

/**
 * "Not now": the person gives a reason in a few words, or taps the ready one, and it goes to the
 * store as an excuse. What Scootch offers back is the store's to decide.
 */
export function NotNow({ onExcuse }: { readonly onExcuse: (text: string) => void }) {
  const { palette, allowFontScaling, size, largeText } = useScreenStyle();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const wiped = t('bargain.wiped');

  if (!open) {
    return (
      <QuietLink
        label={t('session.notNow')}
        hint={t('bargain.notNow.hint')}
        onPress={() => setOpen(true)}
        testID="not-now"
      />
    );
  }
  return (
    <View testID="not-now-reason" style={styles.box}>
      <TextInput
        value={reason}
        onChangeText={setReason}
        placeholder={t('bargain.reason')}
        placeholderTextColor={palette.muted}
        accessibilityLabel={t('bargain.reason')}
        accessibilityHint={t('bargain.reason.hint')}
        allowFontScaling={allowFontScaling}
        maxLength={EXCUSE_MAX}
        returnKeyType="send"
        onSubmitEditing={() => onExcuse(reason.trim() || wiped)}
        testID="not-now-input"
        style={[
          styles.input,
          { color: palette.ink, backgroundColor: palette.surface, fontSize: size(INPUT_SIZE) },
        ]}
      />
      <View style={[styles.row, largeText && styles.stacked]}>
        <CapsuleButton
          label={wiped}
          hint={t('bargain.notNow.hint')}
          tone="quiet"
          onPress={() => onExcuse(wiped)}
          testID="not-now-wiped"
        />
        <CapsuleButton
          label={t('bargain.say')}
          hint={t('bargain.notNow.hint')}
          tone="quiet"
          disabled={reason.trim() === ''}
          onPress={() => onExcuse(reason.trim())}
          testID="not-now-say"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: spacing.sm },
  input: {
    minHeight: 52,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.body,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  stacked: { flexDirection: 'column', alignItems: 'stretch' },
});
