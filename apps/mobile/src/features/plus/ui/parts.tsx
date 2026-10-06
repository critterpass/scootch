import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { radius, spacing } from '@scootch/tokens';

import { Chevron } from '../../../ui/icons';
import { useScreenStyle } from '../../../ui/use-screen-style';
import { SessionText } from '../../session/ui/session-text';

/** A small padlock beside a control that belongs to Plus. */
export function Lock({ color }: { readonly color: string }) {
  return (
    <View style={styles.lock}>
      <View style={[styles.shackle, { borderColor: color }]} />
      <View style={[styles.lockBody, { backgroundColor: color }]} />
    </View>
  );
}

/** The wordmark: the app's name with "Plus" in tomato. */
export function PlusMark({ name, plus }: { readonly name: string; readonly plus: string }) {
  const { palette } = useScreenStyle();
  return (
    <SessionText face="action" color={palette.ink} accessibilityRole="header">
      {name}{' '}
      <SessionText face="action" color={palette.tomato}>
        {plus}
      </SessionText>
    </SessionText>
  );
}

export interface ChoiceRowProps {
  readonly title: string;
  readonly note?: string | null;
  readonly hint: string;
  readonly testID: string;
  readonly onPress?: () => void;
  /** Drawn in tomato: the row that ends something. */
  readonly ending?: boolean;
  /** A few quiet words on the trailing side. */
  readonly aside?: string;
}

/** One full-width row with a chevron. Every row in a set is the same size. */
export function ChoiceRow({ title, note, hint, testID, onPress, ending, aside }: ChoiceRowProps) {
  const { palette } = useScreenStyle();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={note ? `${title}. ${note}` : title}
      accessibilityHint={hint}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: palette.surface, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={styles.rowWords}>
        <SessionText face="action" color={ending ? palette.tomato : palette.ink}>
          {title}
        </SessionText>
        {note ? (
          <SessionText face="caption" color={palette.muted}>
            {note}
          </SessionText>
        ) : null}
      </View>
      {aside ? (
        <SessionText face="caption" color={palette.muted}>
          {aside}
        </SessionText>
      ) : null}
      <Chevron color={palette.muted} direction="right" />
    </Pressable>
  );
}

/** A card of plain words on the surface colour. */
export function Panel({
  children,
  testID,
}: {
  readonly children: ReactNode;
  readonly testID?: string;
}) {
  const { palette } = useScreenStyle();
  return (
    <View testID={testID} style={[styles.panel, { backgroundColor: palette.surface }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  lock: { width: 12, height: 14, justifyContent: 'flex-end', alignItems: 'center' },
  shackle: {
    width: 8,
    height: 8,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  lockBody: { width: 12, height: 8, borderRadius: 2.5 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg + 4,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 76,
  },
  rowWords: { flex: 1, gap: 2 },
  panel: { borderRadius: radius.lg + 4, padding: spacing.lg, gap: spacing.md },
});
