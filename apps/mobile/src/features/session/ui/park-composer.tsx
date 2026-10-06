import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { fonts, radius, spacing } from '@scootch/tokens';

import type { Translate } from '../../../i18n/i18n-provider';
import { useTextSizing } from '../../../screens/registry/support/forced-variant';

import { FilledButton, TextButton } from './controls';
import type { SessionInks } from './session-inks';

/** A parked thought is a few words, not a note. */
const THOUGHT_MAX = 120;

export interface ParkComposerProps {
  readonly inks: SessionInks;
  readonly t: Translate;
  readonly onPark: (text: string) => void;
  readonly onCancel: () => void;
}

/** A few words for a thought that turned up mid-session: typed, parked, gone until the end. */
export function ParkComposer({ inks, t, onPark, onCancel }: ParkComposerProps) {
  const [text, setText] = useState('');
  const { allowFontScaling, size } = useTextSizing();
  const park = () => (text.trim() === '' ? onCancel() : onPark(text.trim()));

  return (
    <View testID="session-park-composer" style={[styles.card, { backgroundColor: inks.surface }]}>
      <TextInput
        autoFocus
        value={text}
        onChangeText={setText}
        onSubmitEditing={park}
        maxLength={THOUGHT_MAX}
        returnKeyType="done"
        submitBehavior="blurAndSubmit"
        placeholder={t('session.park.placeholder')}
        placeholderTextColor={inks.muted}
        accessibilityLabel={t('talk.parkThought')}
        accessibilityHint={t('session.park.hint')}
        allowFontScaling={allowFontScaling}
        maxFontSizeMultiplier={2}
        testID="session-park-input"
        style={[styles.input, { color: inks.ink, fontSize: Math.min(size(19), 38) }]}
      />
      <View style={styles.row}>
        <TextButton
          label={t('session.park.cancel')}
          hint={t('session.park.cancel.hint')}
          testID="session-park-cancel"
          inks={inks}
          onPress={onCancel}
          style={styles.half}
        />
        <FilledButton
          label={t('session.park.save')}
          hint={t('session.park.save.hint')}
          testID="session-park-save"
          inks={inks}
          onPress={park}
          style={styles.half}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  input: {
    fontFamily: fonts.body,
    minHeight: 48,
    paddingHorizontal: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  half: {
    flexGrow: 1,
    flexBasis: 120,
  },
});
