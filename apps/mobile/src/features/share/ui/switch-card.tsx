import { StyleSheet, Switch, Text, View } from 'react-native';

import { fonts, shadows, spacing } from '@scootch/tokens';

import { useScreenStyle } from '../../../ui/use-screen-style';

export interface SwitchCardProps {
  readonly label: string;
  /** One short line under the label saying what the switch comes to. */
  readonly note: string;
  /** What a screen reader says the switch does. */
  readonly hint: string;
  readonly value: boolean;
  readonly onChange: (value: boolean) => void;
  readonly testID: string;
}

/** One choice of the composer that is on or off: its words on a card, with the switch beside them. */
export function SwitchCard({ label, note, hint, value, onChange, testID }: SwitchCardProps) {
  const { palette, allowFontScaling, size } = useScreenStyle();
  return (
    <View style={[styles.card, { backgroundColor: palette.surface }]}>
      <View style={styles.words}>
        <Text
          allowFontScaling={allowFontScaling}
          maxFontSizeMultiplier={1.6}
          style={[styles.label, { color: palette.ink, fontSize: size(16) }]}
        >
          {label}
        </Text>
        <Text
          allowFontScaling={allowFontScaling}
          maxFontSizeMultiplier={1.8}
          style={[styles.note, { color: palette.muted, fontSize: size(13) }]}
        >
          {note}
        </Text>
      </View>
      <Switch
        accessibilityLabel={label}
        accessibilityHint={hint}
        testID={testID}
        value={value}
        onValueChange={onChange}
        trackColor={{ true: palette.tomato }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: 22,
    paddingVertical: 10,
    paddingHorizontal: 16,
    boxShadow: shadows.card,
  },
  words: { flex: 1, gap: 1 },
  label: { fontFamily: fonts.body, fontWeight: '500' },
  note: { fontFamily: fonts.body },
});
