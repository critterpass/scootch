import { StyleSheet, View } from 'react-native';

import { radius, spacing } from '@scootch/tokens';

import { GlassSurface } from '../../../ui/glass-surface';
import { Tick } from '../../../ui/icons';
import { IslandToast } from '../../../ui/motion/island-toast';

import type { SessionInks } from './session-inks';
import { SessionText } from './session-text';

const CHECK_SIZE = 30;
/** The note is on the screen for 2.6 s in all: this leaves room for its drop and its tuck. */
const HOLD_MS = 1400;

export interface ParkedToastProps {
  /** The thought that was just parked. */
  readonly thought: string;
  readonly title: string;
  readonly detail: string;
  readonly inks: SessionInks;
}

/**
 * "Parked": a glass toast that drops from the Island with its tomato check, holds, and tucks away,
 * as the board draws it. It never takes a touch and never moves the session underneath.
 */
export function ParkedToast({ thought, title, detail, inks }: ParkedToastProps) {
  return (
    <IslandToast token={thought} holdMs={HOLD_MS} testID="session-parked-note">
      <GlassSurface style={styles.toast}>
        <View style={[styles.check, { backgroundColor: inks.tomato }]}>
          <Tick color={inks.onTomato} />
        </View>
        <View style={styles.words}>
          <SessionText face="caption" color={inks.ink} style={styles.strong}>
            {title}
          </SessionText>
          <SessionText face="caption" color={inks.muted} numberOfLines={2}>
            {detail}
          </SessionText>
        </View>
      </GlassSurface>
    </IslandToast>
  );
}

const styles = StyleSheet.create({
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.sm,
    paddingRight: spacing.lg,
    overflow: 'hidden',
    maxWidth: '100%',
  },
  check: {
    width: CHECK_SIZE,
    height: CHECK_SIZE,
    borderRadius: CHECK_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  words: {
    flexShrink: 1,
    gap: 2,
  },
  strong: {
    fontWeight: '600',
  },
});
