import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { fonts } from '@scootch/tokens';

import { useT } from '../../../i18n/i18n-provider';
import { GlassSurface } from '../../../ui/glass-surface';
import { SPRING_CURVE } from '../../../ui/motion/motion-tokens';
import { PressSpring } from '../../../ui/motion/press-spring';
import { useScreenStyle } from '../../../ui/use-screen-style';
import { STUDIO_KINDS, type StudioKind } from '../catalogue';

/** The board's tabs: a 38 point glass pill holding three 30 point tabs, 4 points in. */
const TABS = { height: 38, tab: 30, inset: 4, gap: 2 } as const;
/** How long the raised tab takes to slide to the one chosen. */
const SLIDE_MS = 380;

export interface StudioTabsProps {
  readonly shown: StudioKind;
  readonly onShow: (kind: StudioKind) => void;
}

/**
 * Ink, Finish and Trail, in one glass pill between the screen's corners. The chosen tab is raised
 * on a white plate that slides from one to the next; where nothing may move it is simply there.
 */
export function StudioTabs({ shown, onShow }: StudioTabsProps) {
  const t = useT();
  const { palette, reducedMotion, allowFontScaling, size } = useScreenStyle();
  const [spots, setSpots] = useState<Partial<Record<StudioKind, { x: number; width: number }>>>({});
  const spot = spots[shown];
  const x = useSharedValue(0);
  const width = useSharedValue(0);
  const placed = useSharedValue(false);
  useEffect(() => {
    if (!spot) return;
    // The first place it is put is where it starts: nothing slides in from the corner.
    if (reducedMotion || !placed.value) {
      x.value = spot.x;
      width.value = spot.width;
      placed.value = true;
      return;
    }
    x.value = withTiming(spot.x, { duration: SLIDE_MS, easing: SPRING_CURVE });
    width.value = withTiming(spot.width, { duration: SLIDE_MS, easing: SPRING_CURVE });
  }, [spot, reducedMotion, x, width, placed]);
  const plate = useAnimatedStyle(() => ({
    opacity: placed.value ? 1 : 0,
    width: width.value,
    transform: [{ translateX: x.value }],
  }));
  return (
    <GlassSurface style={styles.pill}>
      <View accessibilityRole="tablist" style={styles.row}>
        <Animated.View
          pointerEvents="none"
          style={[styles.plate, { backgroundColor: palette.surface }, plate]}
        />
        {STUDIO_KINDS.map((kind) => {
          const on = kind === shown;
          return (
            <PressSpring
              key={kind}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={t(`studio.tab.${kind}`)}
              accessibilityHint={t('studio.tab.hint')}
              onPress={() => onShow(kind)}
              onLayout={({ nativeEvent }) => {
                const { x: left, width: wide } = nativeEvent.layout;
                setSpots((before) =>
                  before[kind]?.x === left && before[kind]?.width === wide
                    ? before
                    : { ...before, [kind]: { x: left, width: wide } },
                );
              }}
              feedback="choice"
              hitSlop={{ top: 7, bottom: 7 }}
              testID={`studio-tab-${kind}`}
              style={styles.tab}
            >
              <Text
                allowFontScaling={allowFontScaling}
                maxFontSizeMultiplier={1.5}
                numberOfLines={1}
                style={[
                  styles.word,
                  {
                    color: on ? palette.ink : palette.muted,
                    fontSize: size(13),
                    fontWeight: on ? '600' : '500',
                  },
                ]}
              >
                {t(`studio.tab.${kind}`)}
              </Text>
            </PressSpring>
          );
        })}
      </View>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  pill: {
    minHeight: TABS.height,
    borderRadius: TABS.height / 2,
    paddingHorizontal: TABS.inset,
    justifyContent: 'center',
    alignSelf: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: TABS.gap },
  plate: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: TABS.tab / 2,
    boxShadow: '0 1px 3px rgba(28,26,23,0.12)',
  },
  tab: {
    minHeight: TABS.tab,
    borderRadius: TABS.tab / 2,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  word: { fontFamily: fonts.body },
});
