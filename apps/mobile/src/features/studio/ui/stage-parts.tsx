import { useEffect } from 'react';
import { StyleSheet, Text, useWindowDimensions } from 'react-native';
import { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useScreenStyle } from '../../../ui/use-screen-style';
import { STAMPED } from '../../plus/ui/member-card';

/** The board's stage: 392 points tall with a 36 point corner, 16 points in from each side. */
export const STAGE = { height: 392, radius: 36, side: 16, least: 250 } as const;
/**
 * Everything on the studio that is not the stage, at the default text size: the bar, the name and
 * its line, the swatches and the dock, with the gaps between them.
 */
const AROUND_STAGE = 356;
/** The board's 30 points under a dock, never less than the home bar's own clear space. */
const DOCK_BOTTOM = 30;

/**
 * How tall the stage is on this phone: the board's 392 where there is room, and less on a short
 * phone so the swatches and the dock stay on screen without scrolling.
 */
export function useStageSize(): { readonly width: number; readonly height: number } {
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const room = window.height - insets.top - Math.max(insets.bottom, DOCK_BOTTOM) - AROUND_STAGE;
  return {
    width: window.width - STAGE.side * 2,
    height: Math.round(Math.min(STAGE.height, Math.max(STAGE.least, room))),
  };
}

/** A background colour that eases to its next value, as the ink preview recolours. */
export function useEasedBackground(color: string, ms = 500) {
  const { reducedMotion } = useScreenStyle();
  const shown = useSharedValue(color);
  useEffect(() => {
    shown.value = reducedMotion ? color : withTiming(color, { duration: ms });
  }, [color, ms, reducedMotion, shown]);
  return useAnimatedStyle(() => ({ backgroundColor: shown.value }));
}

const PILL_TONES = {
  /** On a light stage: nearly white, in ink. */
  paper: { backgroundColor: 'rgba(255,255,255,0.88)', color: '#1C1A17' },
  /** Something only tried on: tomato, in white. */
  accent: { backgroundColor: '#F0562E', color: '#FFFFFF' },
  /** On the dark stage: a faint white, in white. */
  night: { backgroundColor: 'rgba(255,255,255,0.12)', color: '#FFFFFF' },
} as const;

export interface StagePillProps {
  readonly label: string;
  readonly tone: keyof typeof PILL_TONES;
  readonly side: 'leading' | 'trailing';
  readonly testID?: string;
}

/** A small stamped label in a top corner of a stage: what is on it, and whether it is worn. */
export function StagePill({ label, tone, side, testID }: StagePillProps) {
  const { backgroundColor, color } = PILL_TONES[tone];
  return (
    <Text
      allowFontScaling={false}
      numberOfLines={1}
      testID={testID}
      style={[
        styles.pill,
        side === 'leading' ? styles.leading : styles.trailing,
        { backgroundColor, color },
      ]}
    >
      {label.toLocaleUpperCase()}
    </Text>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    top: 16,
    zIndex: 6,
    overflow: 'hidden',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontFamily: STAMPED,
    fontWeight: '700',
    fontSize: 11,
    lineHeight: 12,
    letterSpacing: 1.1,
  },
  leading: { left: 16 },
  trailing: { right: 16 },
});
