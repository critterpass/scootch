import type { ReactNode } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { fonts, shadows, spacing } from '@scootch/tokens';

import { Chevron, Tick } from '../../ui/icons';
import { useScreenStyle } from '../../ui/use-screen-style';
import { PressSpring } from '../../ui/motion/press-spring';

const ROW_SIZE = 17;
const SUB_SIZE = 14;
const SECTION_SIZE = 13;
const DANGER = '#C8381B';
/** The corner of a group of rows, as the settings board draws it. */
export const GROUP_RADIUS = 26;

/** A small heading over a group of rows. */
export function Section({
  label,
  children,
}: {
  /** The small heading over the group. Left out, the group stands with no heading. */
  readonly label?: string;
  readonly children: ReactNode;
}) {
  const { palette, allowFontScaling, size } = useScreenStyle();
  return (
    <View style={styles.section}>
      {label === undefined ? null : (
        <Text
          accessibilityRole="header"
          allowFontScaling={allowFontScaling}
          style={[styles.sectionLabel, { color: palette.muted, fontSize: size(SECTION_SIZE) }]}
        >
          {label.toLocaleUpperCase()}
        </Text>
      )}
      <View style={[styles.lifted, { backgroundColor: palette.surface }]}>
        <View style={styles.group}>{children}</View>
      </View>
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
  /** Drawn before the words: a small picture of who or what the row is about. */
  readonly leading?: ReactNode;
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
  leading,
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
        {leading}
        {words}
        {end}
      </View>
    );
  }
  return (
    <PressSpring
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
      feedback={kind === 'choice' ? 'choice' : 'none'}
      restOpacity={inert ? 0.5 : 1}
      style={rowStyle}
    >
      {leading}
      {words}
      {end}
    </PressSpring>
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
    <PressSpring
      accessibilityRole="switch"
      accessibilityLabel={[label, sub].filter(Boolean).join('. ')}
      accessibilityHint={hint}
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      feedback="choice"
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
    </PressSpring>
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
  // The board's card: a 26 point corner with a hairline and a wide, faint drop. The drop is on
  // the outer box, since a box that clips its rows would clip its own shadow too.
  lifted: { borderRadius: GROUP_RADIUS, boxShadow: shadows.card },
  group: { borderRadius: GROUP_RADIUS, overflow: 'hidden' },
  note: { fontFamily: fonts.body, marginHorizontal: spacing.md },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  words: { flex: 1, gap: 2 },
  rowLabel: { fontFamily: fonts.body },
  sub: { fontFamily: fonts.body },
  value: { fontFamily: fonts.body, flexShrink: 0 },
});
