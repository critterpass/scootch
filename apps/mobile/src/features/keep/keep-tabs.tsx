import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { fonts, shadows, tracking } from '@scootch/tokens';

import { CONTROL_HEIGHT, DOCK_PADDING, GlassDock, onInkOf } from '../../ui/buttons';
import { PressSpring } from '../../ui/motion/press-spring';
import { useScreenStyle } from '../../ui/use-screen-style';

import { KEEP_TABS, mix, presence, useKeepMotion, type KeepTab } from './keep-motion';

const LABEL = 16;
const GAP = 4;

export interface KeepTabsProps {
  readonly tab: KeepTab;
  readonly labels: Readonly<Record<KeepTab, { readonly label: string; readonly hint: string }>>;
  readonly onTab: (tab: KeepTab) => void;
}

/** One tab's word, written twice: in ink at rest and in the action's ink under the thumb. */
function TabWord({ at, label }: { readonly at: number; readonly label: string }) {
  const { palette, allowFontScaling, size } = useScreenStyle();
  const { from, to, progress } = useKeepMotion();
  const text = { fontSize: size(LABEL), letterSpacing: size(LABEL) * tracking.action };
  const rest = useAnimatedStyle(
    () => ({ opacity: 1 - presence(from.value, to.value, progress.value, at).v }),
    [at],
  );
  const chosen = useAnimatedStyle(
    () => ({ opacity: presence(from.value, to.value, progress.value, at).v }),
    [at],
  );
  const words = { allowFontScaling, maxFontSizeMultiplier: 1.3, numberOfLines: 1 } as const;
  return (
    <View pointerEvents="none">
      <Animated.Text {...words} style={[styles.word, text, { color: palette.ink }, rest]}>
        {label}
      </Animated.Text>
      <Animated.Text
        {...words}
        style={[styles.word, styles.over, text, { color: onInkOf(palette) }, chosen]}
      >
        {label}
      </Animated.Text>
    </View>
  );
}

/**
 * The tabs at the foot of the keeping place: the world, what was caught, and the week's song, in
 * one glass dock. The chosen one sits on an ink thumb that slides to wherever it is sent,
 * stretching a little on the way, in step with the tabs changing above it. They are pressed, not
 * swiped: the sideways swipe belongs to the pages beside home.
 */
export function KeepTabs({ tab, labels, onTab }: KeepTabsProps) {
  const { palette } = useScreenStyle();
  const { from, to, progress, calm } = useKeepMotion();
  const [width, setWidth] = useState(0);
  const each = Math.max(0, (width - GAP * (KEEP_TABS.length - 1)) / KEEP_TABS.length);
  const thumb = useAnimatedStyle(() => {
    const at = mix(from.value, to.value, progress.value);
    // It stretches most half way there, by how far it has to go.
    const far = Math.abs(to.value - from.value);
    const stretch = calm ? 0 : Math.sin(Math.PI * progress.value) * 0.07 * far;
    return {
      transform: [{ translateX: at * (each + GAP) }, { scaleX: 1 + stretch }],
    };
  }, [each, calm]);
  return (
    <GlassDock testID="keep-tabs">
      <View
        accessibilityRole="tablist"
        style={styles.track}
        onLayout={({ nativeEvent }) => setWidth(nativeEvent.layout.width)}
      >
        {each > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.thumb, { width: each, backgroundColor: palette.ink }, thumb]}
          />
        ) : null}
        {KEEP_TABS.map((one, at) => (
          <PressSpring
            key={one}
            accessibilityRole="tab"
            accessibilityLabel={labels[one].label}
            accessibilityHint={labels[one].hint}
            accessibilityState={{ selected: one === tab }}
            onPress={() => onTab(one)}
            feedback="choice"
            testID={`keep-tab-${one}`}
            style={styles.tab}
          >
            <TabWord at={at} label={labels[one].label} />
          </PressSpring>
        ))}
      </View>
    </GlassDock>
  );
}

/** How tall the tab bar is, dock and all. */
export const KEEP_TABS_HEIGHT = CONTROL_HEIGHT + DOCK_PADDING * 2;

const styles = StyleSheet.create({
  track: { flexDirection: 'row', gap: GAP },
  tab: {
    flex: 1,
    minHeight: CONTROL_HEIGHT,
    borderRadius: CONTROL_HEIGHT / 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  thumb: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: CONTROL_HEIGHT / 2,
    boxShadow: shadows.inkButton,
  },
  word: { fontFamily: fonts.body, fontWeight: '600', textAlign: 'center' },
  over: { position: 'absolute', left: 0, right: 0, top: 0 },
});
