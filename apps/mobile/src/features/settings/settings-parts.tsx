import type { ReactNode } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { HAND_FAMILY } from '../../classroom/use-hand-font';
import { PressSpring } from '../../ui/motion/press-spring';
import { usePalette } from '../../ui/use-palette';
import { useScreenStyle } from '../../ui/use-screen-style';

/** The Settings board's warm page and its switch green. */
export const SETTINGS_PAGE = '#F7F1E8';
const SWITCH_ON = '#34A867';
const CLASS_RED = '#D42A24';
/** A full-width cell presses less deep than a button, as the board's `.cell.press`. */
const ROW_PRESS = 0.98;

/** A page title grows only this far, so a long word never breaks at the largest sizes. */
export const TITLE_MAX_SCALE = 1.5;

/** A page title's size: the text size setting's, up to `TITLE_MAX_SCALE`. */
export function titleSize(size: (design: number) => number, design: number): number {
  return Math.min(size(design), design * TITLE_MAX_SCALE);
}

/** The board's quiet inks on the warm page: its muted grey, its chevron and its rules. */
export function useSettingsInk(): { muted: string; chevron: string; rule: string } {
  const palette = usePalette();
  return palette.ink === '#1C1A17'
    ? { muted: '#8A7F74', chevron: '#C4BAAE', rule: 'rgba(28,26,24,0.07)' }
    : { muted: palette.muted, chevron: palette.chevron, rule: `${palette.ink}12` };
}

/** The line between two cells, inset from the left as the board's `.cell + .cell`. */
export function Rule() {
  const { rule } = useSettingsInk();
  return <View style={[styles.rule, { backgroundColor: rule }]} />;
}

export { Segments } from './settings-segments';

export function usePage(): string {
  const { palette } = useScreenStyle();
  return palette.ink === '#1C1A17' ? SETTINGS_PAGE : palette.page;
}

/** A section's heading, with an optional handwritten note at its end. */
export function Head({ title, note }: { readonly title: string; readonly note?: string }) {
  const { allowFontScaling, size } = useScreenStyle();
  const { muted } = useSettingsInk();
  return (
    <View style={styles.head}>
      <Text
        accessibilityRole="header"
        allowFontScaling={allowFontScaling}
        style={[styles.headText, { color: muted, fontSize: size(12) }]}
      >
        {title}
      </Text>
      {note === undefined ? null : (
        <Text allowFontScaling={allowFontScaling} style={[styles.headNote, { fontSize: size(16) }]}>
          {note}
        </Text>
      )}
    </View>
  );
}

export function Group({ children }: { readonly children: ReactNode }) {
  const { palette } = useScreenStyle();
  return <View style={[styles.group, { backgroundColor: palette.surface }]}>{children}</View>;
}

export function Foot({ children }: { readonly children: string }) {
  const { allowFontScaling, size } = useScreenStyle();
  const { muted } = useSettingsInk();
  return (
    <Text
      allowFontScaling={allowFontScaling}
      style={[styles.foot, { color: muted, fontSize: size(13) }]}
    >
      {children}
    </Text>
  );
}

/** The row's chevron, drawn from a view's two edges, so it needs no image. */
function Chevron() {
  const { chevron } = useSettingsInk();
  return <View style={[styles.chevron, { borderColor: chevron }]} />;
}

export interface RowProps {
  readonly label: string;
  readonly value?: string;
  readonly hint?: string;
  readonly onPress?: () => void;
  /** A row that opens something shows the chevron. */
  readonly chevron?: boolean;
  readonly tone?: 'plain' | 'danger' | 'link';
  readonly first?: boolean;
  readonly faded?: boolean;
  readonly testID?: string;
}

/** One cell: its label, and its value or a chevron at the end. At large sizes the value wraps under. */
export function Row({
  label,
  value,
  hint,
  onPress,
  chevron = false,
  tone = 'plain',
  first = false,
  faded = false,
  testID,
}: RowProps) {
  const { palette, allowFontScaling, size, largeText } = useScreenStyle();
  const { muted } = useSettingsInk();
  const color = tone === 'danger' ? CLASS_RED : tone === 'link' ? '#2B5BA8' : palette.ink;
  const body = (
    <View style={[styles.cell, largeText && styles.cellStacked, faded && styles.faded]}>
      {first ? null : <Rule />}
      <Text
        allowFontScaling={allowFontScaling}
        style={[
          styles.cellLabel,
          { color, fontSize: size(16) },
          tone !== 'plain' && styles.cellStrong,
          tone === 'link' && styles.centred,
        ]}
      >
        {label}
      </Text>
      {value !== undefined || chevron ? (
        <View style={styles.value}>
          {value === undefined ? null : (
            <Text allowFontScaling={allowFontScaling} style={{ color: muted, fontSize: size(15) }}>
              {value}
            </Text>
          )}
          {chevron ? <Chevron /> : null}
        </View>
      ) : null}
    </View>
  );
  if (onPress === undefined) {
    return (
      <View
        accessible
        accessibilityLabel={value === undefined ? label : `${label}, ${value}`}
        testID={testID}
      >
        {body}
      </View>
    );
  }
  return (
    <PressSpring
      accessibilityRole={tone === 'link' || chevron ? 'link' : 'button'}
      accessibilityLabel={value === undefined ? label : `${label}, ${value}`}
      {...(hint === undefined ? {} : { accessibilityHint: hint })}
      onPress={onPress}
      feedback="choice"
      pressScale={ROW_PRESS}
      {...(testID === undefined ? {} : { testID })}
    >
      {body}
    </PressSpring>
  );
}

/** A cell with the system's switch. */
export function SwitchRow({
  label,
  value,
  onChange,
  first = false,
  disabled = false,
  testID,
}: {
  readonly label: string;
  readonly value: boolean;
  readonly onChange: (next: boolean) => void;
  readonly first?: boolean;
  readonly disabled?: boolean;
  readonly testID?: string;
}) {
  const { palette, allowFontScaling, size } = useScreenStyle();
  return (
    <View style={styles.cell}>
      {first ? null : <Rule />}
      <Text
        allowFontScaling={allowFontScaling}
        style={[styles.cellLabel, { color: palette.ink, fontSize: size(16) }]}
      >
        {label}
      </Text>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ true: SWITCH_ON }}
        accessibilityLabel={label}
        {...(testID === undefined ? {} : { testID })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    marginTop: 26,
    marginBottom: 8,
    marginHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  headText: { fontWeight: '700', letterSpacing: 0.7, textTransform: 'uppercase' },
  headNote: { fontFamily: HAND_FAMILY, color: CLASS_RED },
  group: {
    marginHorizontal: 16,
    borderRadius: 20,
    overflow: 'hidden',
    boxShadow: '0 1px 2px rgba(60,40,20,0.05)',
  },
  foot: { marginTop: 8, marginHorizontal: 20 },
  cell: {
    minHeight: 50,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cellStacked: { flexDirection: 'column', alignItems: 'flex-start', gap: 4 },
  cellLabel: { flexShrink: 1, flexGrow: 1 },
  cellStrong: { fontWeight: '600' },
  centred: { textAlign: 'center' },
  value: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  faded: { opacity: 0.4 },
  rule: { position: 'absolute', top: 0, left: 16, right: 0, height: 1 },
  chevron: {
    width: 8,
    height: 8,
    marginRight: 3,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderRadius: 1,
    transform: [{ rotate: '45deg' }],
  },
});
