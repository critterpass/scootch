import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CORNER } from '../../../ui/corner-bar';
import { GlassSurface } from '../../../ui/glass-surface';
import { CROSSFADE_MS, SPRING_CURVE } from '../../../ui/motion/motion-tokens';
import { PressSpring } from '../../../ui/motion/press-spring';
import { useMayMove } from '../../../ui/motion/use-feel';

import type { SessionInks } from './session-inks';
import { SessionText } from './session-text';

const OPEN_MS = 260;
const GAP_UNDER_BUTTON = 8;
const ROW_HEIGHT = 52;

export interface SessionMenuItem {
  readonly label: string;
  readonly hint: string;
  readonly testID: string;
  readonly onPress: () => void;
}

export interface SessionMenuProps {
  /** In the order shown. "I'm stuck" is always first: help is one tap into the menu. */
  readonly items: readonly SessionMenuItem[];
  readonly inks: SessionInks;
  /** What VoiceOver calls the space around the menu, which closes it. */
  readonly closeLabel: string;
  readonly onClose: () => void;
}

/**
 * The session's menu: a small glass popover hanging from the corner control, with everything that
 * is not the work itself. It opens from the control it belongs to and a touch anywhere else closes
 * it; the timer runs on underneath.
 */
export function SessionMenu({ items, inks, closeLabel, onClose }: SessionMenuProps) {
  const insets = useSafeAreaInsets();
  const mayMove = useMayMove();
  const shown = useSharedValue(0);

  useEffect(() => {
    shown.value = withTiming(1, {
      duration: mayMove ? OPEN_MS : CROSSFADE_MS,
      easing: SPRING_CURVE,
      reduceMotion: ReduceMotion.Never,
    });
  }, [mayMove, shown]);

  const opening = useAnimatedStyle(() => ({
    opacity: Math.min(1, shown.value * 2),
    transform: [{ scale: mayMove ? 0.86 + 0.14 * shown.value : 1 }],
  }));

  return (
    <View style={StyleSheet.absoluteFill} testID="session-menu-open">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={closeLabel}
        testID="session-menu-close"
        onPress={onClose}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View
        accessibilityRole="menu"
        style={[
          styles.popover,
          {
            top: insets.top + CORNER.top + CORNER.size + GAP_UNDER_BUTTON,
            right: insets.right + CORNER.side,
            maxWidth: 320,
          },
          opening,
        ]}
      >
        <GlassSurface style={styles.glass}>
          {items.map((item, index) => (
            <PressSpring
              key={item.testID}
              accessibilityRole="menuitem"
              accessibilityLabel={item.label}
              accessibilityHint={item.hint}
              testID={item.testID}
              feedback="choice"
              onPress={() => {
                onClose();
                item.onPress();
              }}
              style={[
                styles.row,
                index > 0
                  ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: inks.hairline }
                  : null,
              ]}
            >
              <SessionText face="row" color={inks.ink}>
                {item.label}
              </SessionText>
            </PressSpring>
          ))}
        </GlassSurface>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  popover: {
    position: 'absolute',
    minWidth: 220,
    transformOrigin: 'top right',
    shadowColor: '#1C1A17',
    shadowOpacity: 0.18,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 10 },
  },
  glass: {
    borderRadius: 26,
    overflow: 'hidden',
  },
  row: {
    minHeight: ROW_HEIGHT,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
  },
});
