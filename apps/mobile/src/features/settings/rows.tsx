import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { fonts, radius, spacing } from '@scootch/tokens';

import { Chevron, Tick } from '../../ui/icons';
import { useScreenStyle } from '../../ui/use-screen-style';

const ROW_SIZE = 17;
const SUB_SIZE = 14;
const SECTION_SIZE = 13;
const DANGER = '#C8381B';

/** A small heading over a group of rows. */
export function Section({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}) {
  const { palette, allowFontScaling, size } = useScreenStyle();
  return (
    <View style={styles.section}>
      <Text
        accessibilityRole="header"
        allowFontScaling={allowFontScaling}
        style={[styles.sectionLabel, { color: palette.muted, fontSize: size(SECTION_SIZE) }]}
      >
        {label.toLocaleUpperCase()}
      </Text>
      <View style={[styles.group, { backgroundColor: palette.surface }]}>{children}</View>
    </View>
  );
}

/** Small words under a group, or at the foot of a page. */
export function Note({ text, testID }: { readonly text: string; readonly testID?: string }) {
  const { palette, allowFontScaling, size } = useScreenStyle();
  return (
    <Text
      testID={testID}
      allowFontScaling={allowFontScaling}
      style={[styles.note, { color: palette.muted, fontSize: size(SUB_SIZE) }]}
    >
      {text}
    </Text>
  );
}

export interface RowProps {
  readonly label: string;
  /** What a screen reader says the row does. Every row that can be pressed has one. */
  readonly hint?: string;
  readonly sub?: string;
  /** The current value, at the row's end; under the label at the large text sizes. */
  readonly value?: string;
  readonly onPress?: () => void;
  /** Drawn and read out, and says it does nothing yet. */
  readonly inert?: boolean;
  readonly danger?: boolean;
  readonly selected?: boolean;
  /** A row that only states something has no chevron and is not a button. */
  readonly kind?: 'link' | 'choice' | 'fact';
  readonly first?: boolean;
  readonly testID?: string;
}

/** One row of a group. Its words wrap instead of being cut short. */
export function Row({
  label,
  hint,
  sub,
  value,
  onPress,
  inert = false,
  danger = false,
  selected,
  kind = 'link',
  first = false,
  testID,
}: RowProps) {
  const { palette, allowFontScaling, size, largeText } = useScreenStyle();
  const words = (
    <View style={styles.words}>
      <Text
        allowFontScaling={allowFontScaling}
        style={[
          styles.rowLabel,
          { color: danger ? DANGER : palette.ink, fontSize: size(ROW_SIZE) },
        ]}
      >
        {label}
      </Text>
      {sub === undefined ? null : (
        <Text
          allowFontScaling={allowFontScaling}
          style={[styles.sub, { color: palette.muted, fontSize: size(SUB_SIZE) }]}
        >
          {sub}
        </Text>
      )}
      {value !== undefined && largeText ? (
        <Text
          allowFontScaling={allowFontScaling}
          style={[styles.sub, { color: palette.muted, fontSize: size(ROW_SIZE) }]}
        >
          {value}
        </Text>
      ) : null}
    </View>
  );
  const end = (
    <>
      {value !== undefined && !largeText ? (
        <Text
          allowFontScaling={allowFontScaling}
          style={[styles.value, { color: palette.muted, fontSize: size(ROW_SIZE) }]}
        >
          {value}
        </Text>
      ) : null}
      {kind === 'choice' && selected ? <Tick color={palette.tomato} /> : null}
      {kind === 'link' ? <Chevron color={palette.muted} direction="right" /> : null}
    </>
  );
  const rowStyle = [
    styles.row,
    !first && { borderTopColor: `${palette.ink}1F`, borderTopWidth: StyleSheet.hairlineWidth },
  ];

  if (kind === 'fact') {
    return (
      <View
        accessible
        accessibilityLabel={[label, sub, value].filter(Boolean).join('. ')}
        testID={testID}
        style={rowStyle}
      >
        {words}
        {end}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole={kind === 'choice' ? 'radio' : 'button'}
      accessibilityLabel={[label, sub].filter(Boolean).join('. ')}
      accessibilityHint={hint}
      accessibilityState={{
        disabled: inert,
        ...(kind === 'choice' ? { selected: selected === true } : {}),
      }}
      {...(value === undefined ? {} : { accessibilityValue: { text: value } })}
      disabled={inert}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [rowStyle, { opacity: inert ? 0.5 : pressed ? 0.7 : 1 }]}
    >
      {words}
      {end}
    </Pressable>
  );
}

export interface SwitchRowProps {
  readonly label: string;
  readonly hint: string;
  readonly sub?: string;
  readonly value: boolean;
  readonly onChange: (value: boolean) => void;
  readonly first?: boolean;
  readonly testID?: string;
}

/** A row with a switch. The whole row is one control for a screen reader. */
export function SwitchRow({
  label,
  hint,
  sub,
  value,
  onChange,
  first = false,
  testID,
}: SwitchRowProps) {
  const { palette, allowFontScaling, size } = useScreenStyle();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={[label, sub].filter(Boolean).join('. ')}
      accessibilityHint={hint}
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      testID={testID}
      style={[
        styles.row,
        !first && { borderTopColor: `${palette.ink}1F`, borderTopWidth: StyleSheet.hairlineWidth },
      ]}
    >
      <View style={styles.words}>
        <Text
          allowFontScaling={allowFontScaling}
          style={[styles.rowLabel, { color: palette.ink, fontSize: size(ROW_SIZE) }]}
        >
          {label}
        </Text>
        {sub === undefined ? null : (
          <Text
            allowFontScaling={allowFontScaling}
            style={[styles.sub, { color: palette.muted, fontSize: size(SUB_SIZE) }]}
          >
            {sub}
          </Text>
        )}
      </View>
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Switch value={value} trackColor={{ true: palette.tomato }} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cross: {
    position: 'absolute',
    width: 16,
    height: 2,
    borderRadius: 1,
    transform: [{ rotate: '45deg' }],
  },
  crossOver: { transform: [{ rotate: '-45deg' }] },
  section: { gap: spacing.sm },
  sectionLabel: { fontFamily: fonts.body, marginLeft: spacing.md, letterSpacing: 0.3 },
  group: { borderRadius: radius.lg, overflow: 'hidden' },
  note: { fontFamily: fonts.body, marginHorizontal: spacing.md },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  words: { flex: 1, gap: 2 },
  rowLabel: { fontFamily: fonts.body },
  sub: { fontFamily: fonts.body },
  value: { fontFamily: fonts.body, flexShrink: 0 },
});
