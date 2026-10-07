import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { GlassSurface } from '../../../ui/glass-surface';
import { PressSpring } from '../../../ui/motion/press-spring';

import type { ControlProps } from './controls';
import { SessionText } from './session-text';

const BUTTON_HEIGHT = 54;

/** The glass dock at the foot of a screen: two buttons side by side, seven points apart. */
export function Dock({
  children,
  testID,
}: {
  readonly children: ReactNode;
  readonly testID?: string;
}) {
  return (
    <GlassSurface style={styles.dock} {...(testID ? { testID } : {})}>
      <View style={styles.row}>{children}</View>
    </GlassSurface>
  );
}

/** A row of dock buttons inside something else: the stuck card's "Smaller" and "Okay". */
export function DockRow({
  children,
  style,
}: {
  readonly children: ReactNode;
  readonly style?: ViewProps['style'];
}) {
  return <View style={[styles.row, style]}>{children}</View>;
}

/**
 * One button of a dock, 54 points tall and fully round. `ink` is the action: filled, lit along its
 * top edge and lifted off the glass. `plain` is the way out beside it: words and nothing else.
 */
export function DockButton({
  label,
  hint,
  testID,
  inks,
  onPress,
  tone,
}: ControlProps & { readonly tone: 'ink' | 'plain' }) {
  const ink = tone === 'ink';
  return (
    <PressSpring
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      testID={testID}
      onPress={onPress}
      feedback={ink ? 'primary' : 'choice'}
      style={[styles.button, ink ? [styles.ink, { backgroundColor: inks.button }] : null]}
    >
      {ink ? <View pointerEvents="none" style={styles.lit} /> : null}
      <SessionText
        face={ink ? 'dockStrong' : 'dock'}
        color={ink ? inks.onButton : inks.ink}
        style={styles.label}
      >
        {label}
      </SessionText>
    </PressSpring>
  );
}

const styles = StyleSheet.create({
  dock: {
    borderRadius: 34,
    padding: 7,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 7,
  },
  button: {
    flexGrow: 1,
    flexBasis: 120,
    minHeight: BUTTON_HEIGHT,
    borderRadius: BUTTON_HEIGHT / 2,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ink: {
    shadowColor: '#1C1A17',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  // The lit top edge of the filled button: one point of white at 20%.
  lit: {
    position: 'absolute',
    top: 0,
    left: 14,
    right: 14,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  label: {
    textAlign: 'center',
  },
});
