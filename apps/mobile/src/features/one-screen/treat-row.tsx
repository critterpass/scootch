import { useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';

import { fonts } from '@scootch/tokens';

import { useT } from '../../i18n/i18n-provider';
import { Chevron } from '../../ui/icons';
import { PressSpring } from '../../ui/motion/press-spring';
import { useScreenStyle } from '../../ui/use-screen-style';

const ROW_SIZE = 17;
/** The white rows of the boards: a hairline of ink and a soft drop under them. */
export const CARD_SHADOW =
  '0 0 0 0.5px rgba(28, 26, 23, 0.06), 0 8px 24px -6px rgba(28, 26, 23, 0.1)';

export interface TreatRowProps {
  readonly treat: string;
  readonly onTreat: (treat: string) => void;
}

/**
 * "Treat after this | Coffee ›": one row, as the board draws it. A tap opens the row for typing,
 * in place; leaving the keyboard closes it again with the treat shown in the row.
 */
export function TreatRow({ treat, onTreat }: TreatRowProps) {
  const { palette, allowFontScaling, size, largeText } = useScreenStyle();
  const t = useT();
  const [editing, setEditing] = useState(false);
  const named = treat.trim();
  const type = { fontSize: size(ROW_SIZE) };

  return (
    <PressSpring
      accessibilityRole="button"
      accessibilityLabel={named ? `${t('taskSet.treat')}, ${named}` : t('taskSet.treat')}
      accessibilityHint={t('taskSet.treat.hint')}
      onPress={() => setEditing(true)}
      feedback="choice"
      testID="task-set-treat"
      style={[styles.row, largeText && styles.stacked, { backgroundColor: palette.surface }]}
    >
      <Text
        allowFontScaling={allowFontScaling}
        style={[styles.label, type, { color: palette.ink, lineHeight: type.fontSize * 1.3 }]}
      >
        {t('taskSet.treat')}
      </Text>
      {editing ? (
        <TextInput
          value={treat}
          onChangeText={onTreat}
          onBlur={() => setEditing(false)}
          onSubmitEditing={() => setEditing(false)}
          placeholder={t('taskSet.treat.placeholder')}
          placeholderTextColor={palette.faint}
          accessibilityLabel={t('taskSet.treat')}
          allowFontScaling={allowFontScaling}
          autoFocus
          maxLength={80}
          returnKeyType="done"
          testID="task-set-treat-input"
          style={[styles.value, styles.input, type, { color: palette.ink }]}
        />
      ) : (
        <Text
          allowFontScaling={allowFontScaling}
          numberOfLines={largeText ? 3 : 1}
          style={[styles.value, type, { color: named ? palette.muted : palette.faint }]}
        >
          {named || t('taskSet.treat.placeholder')}
        </Text>
      )}
      <Chevron color={palette.chevron} direction="right" />
    </PressSpring>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 16,
    borderRadius: 22,
    boxShadow: CARD_SHADOW,
  },
  stacked: {
    flexWrap: 'wrap',
    paddingVertical: 12,
  },
  label: {
    flexGrow: 1,
    fontFamily: fonts.body,
  },
  value: {
    flexShrink: 1,
    textAlign: 'right',
    fontFamily: fonts.body,
  },
  input: {
    flexGrow: 1,
    minHeight: 44,
    padding: 0,
  },
});
