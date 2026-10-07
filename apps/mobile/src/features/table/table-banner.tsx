import { StyleSheet, View } from 'react-native';

import { GlassSurface } from '../../ui/glass-surface';
import { PressSpring } from '../../ui/motion/press-spring';

import { CritterAvatar } from './critter-avatar';
import { Words } from './words';

export interface TableBannerProps {
  /** Whose critter leads the banner; unset, it is words alone (the line dropped, not a person). */
  readonly seed?: string | undefined;
  readonly title: string;
  readonly sub?: string | null;
  /** What a screen reader says a tap does. */
  readonly hint?: string;
  /** A tap puts the banner away. Unset, it stays: it says how things are, not what happened. */
  readonly onPress?: (() => void) | undefined;
  readonly testID: string;
}

/**
 * The glass banner over the seat card, as the board draws an arrival and a wave: a small critter,
 * what happened, and one line under it. It is said once to a screen reader, and a tap puts it away.
 */
export function TableBanner({ seed, title, sub = null, hint, onPress, testID }: TableBannerProps) {
  const inside = (
    <GlassSurface style={styles.banner}>
      <View pointerEvents="none" style={styles.row}>
        {seed === undefined ? null : <CritterAvatar seed={seed} />}
        <View style={styles.words}>
          <Words kind="strong">{title}</Words>
          {sub === null ? null : <Words kind="quiet">{sub}</Words>}
        </View>
      </View>
    </GlassSurface>
  );
  if (onPress === undefined) {
    return (
      <View accessible accessibilityLiveRegion="polite" testID={testID}>
        {inside}
      </View>
    );
  }
  return (
    <PressSpring
      accessibilityRole="button"
      accessibilityLabel={[title, sub].filter(Boolean).join('. ')}
      {...(hint === undefined ? {} : { accessibilityHint: hint })}
      accessibilityLiveRegion="polite"
      onPress={onPress}
      feedback="choice"
      testID={testID}
    >
      {inside}
    </PressSpring>
  );
}

const styles = StyleSheet.create({
  banner: { borderRadius: 30, overflow: 'hidden' },
  row: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  words: { flexGrow: 1, flexShrink: 1, flexBasis: 0, gap: 1 },
});
