import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnUI } from 'react-native-worklets';

import { useT } from '../../i18n/i18n-provider';
import { CloseButton, CORNER, ForwardButton } from '../../ui/corner-bar';
import { CROSSFADE_MS, SPRING_CURVE } from '../../ui/motion/motion-tokens';
import { SafeFrame } from '../../ui/safe-frame';
import { useScreenStyle } from '../../ui/use-screen-style';

import {
  KEEP_TABS,
  KeepMotionContext,
  presence,
  TAB_MS,
  type KeepMotion,
  type KeepTab,
  type Sand,
} from './keep-motion';
import { KEEP_TABS_HEIGHT, KeepTabs } from './keep-tabs';

/** From the bottom of the screen up to the tab bar, and its gutter, as the boards draw a dock. */
const BAR = { bottom: 30, side: 24, air: 14 } as const;
// Whether anything moves is decided once, by the screen; the animation does not ask again.
const ALWAYS = ReduceMotion.Never;

export interface KeepScreenProps {
  readonly tab: KeepTab;
  readonly onTab: (tab: KeepTab) => void;
  readonly close: () => void;
  /**
   * True beside home, where closing slides to home at the trailing side: the control is then an
   * arrow pointing that way. Anywhere else it is the close control every screen has.
   */
  readonly homeIsBeside?: boolean;
  /**
   * Each tab's content. One left out is not drawn yet: the frame keeps its place, and it arrives
   * with its own movement when it is first asked for.
   */
  readonly panes: Readonly<Partial<Record<KeepTab, ReactNode>>>;
  /**
   * True where a change of tab should simply be there: the page is out of sight beside home, or
   * the Motion switch is set to calm. Reduce Motion is read by the screen itself.
   */
  readonly calm?: boolean;
}

/** One tab's room. Only the tab in view takes touches and is read out. */
function Layer({
  at,
  current,
  motion,
  children,
}: {
  readonly at: number;
  readonly current: boolean;
  readonly motion: KeepMotion;
  readonly children: ReactNode;
}) {
  const { from, to, progress } = motion;
  // The room itself is either there or not: what is in it fades and moves by itself, so glass in
  // it is never under a see-through parent once the move is over.
  const there = useAnimatedStyle(
    () => ({ opacity: presence(from.value, to.value, progress.value, at).v > 0 ? 1 : 0 }),
    [at],
  );
  return (
    <Animated.View
      pointerEvents={current ? 'auto' : 'none'}
      accessibilityElementsHidden={!current}
      importantForAccessibility={current ? 'auto' : 'no-hide-descendants'}
      style={[StyleSheet.absoluteFill, there]}
    >
      {children}
    </Animated.View>
  );
}

/**
 * The keeping place: the world, everything caught and the week's song, as three tabs of one
 * screen. The close control and the tab bar stay where they are; between them one tab gives way
 * to the next in a single movement that each tab plays its own part in (the island pulling back
 * into the shelf, the sand tipping up into the record). Tabs are pressed, never swiped.
 */
export function KeepScreen(props: KeepScreenProps) {
  const { tab, onTab, close, panes, calm = false, homeIsBeside = false } = props;
  const t = useT();
  const { palette, reducedMotion } = useScreenStyle();
  const insets = useSafeAreaInsets();
  const still = reducedMotion || calm;
  const at = KEEP_TABS.indexOf(tab);
  const from = useSharedValue(at);
  const to = useSharedValue(at);
  const progress = useSharedValue(1);
  const sand = useSharedValue<Sand | null>(null);

  const shownAt = useRef(at);
  useEffect(() => {
    if (shownAt.current === at) return;
    shownAt.current = at;
    // Out of sight, or held still, the tab is simply there; under Reduce Motion it fades in.
    const duration = calm ? 0 : reducedMotion ? CROSSFADE_MS : TAB_MS;
    // The three values change together, in one step on the thread that draws: no frame ever sees
    // the new tab named before its move has been set back to its start.
    scheduleOnUI(() => {
      'worklet';
      // A move cut short lands where it was going before the next one sets off.
      from.value = duration === 0 ? at : to.value;
      to.value = at;
      if (duration === 0) {
        progress.value = 1;
        return;
      }
      progress.value = 0;
      progress.value = withTiming(1, { duration, easing: SPRING_CURVE, reduceMotion: ALWAYS });
    });
    // The shared values are stable for the life of the screen.
  }, [at, calm, reducedMotion, from, to, progress]);

  // The tab bar sits where every dock does; each tab keeps this much clear at its foot.
  const barBottom = Math.max(insets.bottom, BAR.bottom) - insets.bottom;
  const barSpace = barBottom + KEEP_TABS_HEIGHT + BAR.air;
  const motion = useMemo<KeepMotion>(
    () => ({ from, to, progress, sand, calm: still, barSpace }),
    [from, to, progress, sand, still, barSpace],
  );
  const labels = useMemo(
    () => ({
      world: { label: t('keep.tab.world'), hint: t('keep.tab.world.hint') },
      caught: { label: t('keep.tab.caught'), hint: t('keep.tab.caught.hint') },
      song: { label: t('keep.tab.song'), hint: t('keep.tab.song.hint') },
    }),
    [t],
  );
  return (
    <SafeFrame testID="keep" style={[styles.fill, { backgroundColor: palette.page }]}>
      <KeepMotionContext.Provider value={motion}>
        <View style={styles.fill}>
          {KEEP_TABS.map((one, index) =>
            panes[one] === undefined || panes[one] === null ? null : (
              <Layer key={one} at={index} current={one === tab} motion={motion}>
                {panes[one]}
              </Layer>
            ),
          )}
          <View pointerEvents="box-none" style={[styles.tabs, { bottom: barBottom }]}>
            <KeepTabs tab={tab} labels={labels} onTab={onTab} />
          </View>
          {/* Drawn last: nothing on a tab can lie over the close control and take its touch. */}
          <View style={styles.close}>
            {homeIsBeside ? (
              <ForwardButton
                label={t('keep.close')}
                hint={t('keep.close.hint')}
                onPress={close}
                testID="keep-close"
              />
            ) : (
              <CloseButton
                label={t('keep.close')}
                hint={t('keep.close.hint')}
                onPress={close}
                testID="keep-close"
              />
            )}
          </View>
        </View>
      </KeepMotionContext.Provider>
    </SafeFrame>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  tabs: { position: 'absolute', left: BAR.side, right: BAR.side },
  close: { position: 'absolute', top: CORNER.top, right: CORNER.side },
});
