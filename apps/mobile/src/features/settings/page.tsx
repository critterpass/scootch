import { useState, type ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fonts, fontSizes, spacing } from '@scootch/tokens';

import { useT } from '../../i18n/i18n-provider';
import { BackButton, CORNER, CornerBar, MenuButton } from '../../ui/corner-bar';
import { EdgeFade } from '../../ui/edge-fade';
import { SafeFrame } from '../../ui/safe-frame';
import { useScreenStyle } from '../../ui/use-screen-style';

/** From the bottom of the screen up to a dock, and the dock's gutter, as the boards draw them. */
const DOCK_BOTTOM = 30;
const DOCK_GUTTER = 14;
const BAR_TITLE_SIZE = 17;
/** How far a page scrolls before its large title has gone up under the bar. */
const COLLAPSES_BY = 48;
/** How far the title grows when the page is pulled down past its top, and over what pull. */
const STRETCH = { by: 1.08, over: 90 } as const;
/** How far below the bar the list is still fading into the page. */
const FADE_BELOW = 22;

export interface PageProps {
  /**
   * The page's large title: under the bar at rest, scrolling away with the list, and taken up
   * small by the bar once it has gone. Left out, the small centred title is shown from the start.
   */
  readonly title?: string;
  readonly barTitle?: string;
  readonly onClose: () => void;
  readonly testID: string;
  /** The page's own menu, in the trailing corner. */
  readonly menu?: { readonly label: string; readonly hint: string; readonly onPress: () => void };
  /** The page's actions, in a dock that stays at the bottom while the page scrolls above it. */
  readonly footer?: ReactNode;
  readonly children: ReactNode;
}

/**
 * A page of rows, under the one heading every page wears: the way back as a round arrow in the
 * leading corner, and the title large under it. The list scrolls under the bar and fades into the
 * page there instead of being cut off on a line; as it goes the large title shrinks away and the
 * bar takes it up small. The bar is the page's own on every route, so a page looks the same
 * beside home, pushed, or opened from a link. A page is gone back from; only a sheet or a moment
 * is closed, and those keep their cross in the trailing corner.
 */
export function Page({ title, barTitle, onClose, testID, menu, footer, children }: PageProps) {
  const { palette, allowFontScaling, size, reducedMotion } = useScreenStyle();
  const t = useT();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [barHeight, setBarHeight] = useState<number>(CORNER.size);

  // The large title rides the scroll on the UI thread.
  const scrolled = useSharedValue(0);
  const follow = useAnimatedScrollHandler((event) => {
    scrolled.value = event.contentOffset.y;
  });
  const riding = useAnimatedStyle(() => {
    const y = scrolled.value;
    if (reducedMotion) return { opacity: y > COLLAPSES_BY ? 0 : 1 };
    return {
      opacity: interpolate(y, [COLLAPSES_BY * 0.35, COLLAPSES_BY], [1, 0], Extrapolation.CLAMP),
      transform: [
        {
          scale: interpolate(
            y,
            [-STRETCH.over, 0, COLLAPSES_BY],
            [STRETCH.by, 1, 0.88],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  }, [reducedMotion]);
  // The bar's own small title fades in over the last of the large one's way out.
  const taken = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrolled.value,
      [COLLAPSES_BY * 0.7, COLLAPSES_BY + 12],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));
  // The veil under the bar is there once something has scrolled under it, and not before: at
  // rest nothing lies over the large title.
  const veiled = useAnimatedStyle(() => ({
    opacity: interpolate(scrolled.value, [0, 14], [0, 1], Extrapolation.CLAMP),
  }));

  const close = {
    label: t('settings.close'),
    hint: t('settings.close.hint'),
    onPress: onClose,
    testID: `${testID}-close`,
  };
  const menuItem = menu === undefined ? undefined : { ...menu, testID: `${testID}-menu` };
  const small = barTitle ?? title;
  return (
    <SafeFrame style={[styles.page, { backgroundColor: palette.page }]} testID={testID}>
      <View style={styles.page}>
        <Animated.ScrollView
          onScroll={follow}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingTop: barHeight + spacing.sm }]}
          testID={`${testID}-list`}
        >
          {title === undefined ? null : (
            <Animated.Text
              accessibilityRole="header"
              allowFontScaling={allowFontScaling}
              maxFontSizeMultiplier={1.5}
              style={[
                styles.title,
                {
                  color: palette.ink,
                  fontSize: size(fontSizes.sentence),
                  lineHeight: size(fontSizes.sentence) * 1.14,
                },
                riding,
              ]}
            >
              {title}
            </Animated.Text>
          )}
          {children}
        </Animated.ScrollView>
        <View pointerEvents="box-none" style={styles.over}>
          <Animated.View pointerEvents="none" style={[styles.veil, veiled]}>
            <EdgeFade
              color={palette.page}
              width={width}
              height={barHeight + FADE_BELOW}
              edge="top"
              solid={barHeight / (barHeight + FADE_BELOW)}
            />
          </Animated.View>
          <View onLayout={({ nativeEvent }) => setBarHeight(nativeEvent.layout.height)}>
            <CornerBar
              leading={<BackButton {...close} />}
              // With no menu, an empty corner keeps the small title in the middle.
              trailing={
                menuItem === undefined ? (
                  <View style={styles.corner} />
                ) : (
                  <MenuButton {...menuItem} />
                )
              }
            >
              {small === undefined ? null : (
                <Animated.Text
                  accessibilityRole={title === undefined ? 'header' : 'none'}
                  allowFontScaling={allowFontScaling}
                  maxFontSizeMultiplier={1.4}
                  numberOfLines={1}
                  style={[
                    styles.barTitle,
                    { color: palette.ink, fontSize: size(BAR_TITLE_SIZE) },
                    title === undefined ? null : taken,
                  ]}
                >
                  {small}
                </Animated.Text>
              )}
            </CornerBar>
          </View>
        </View>
      </View>
      {footer === undefined ? null : (
        // The board's 30 points under a dock, never less than the home bar's own clear space.
        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, DOCK_BOTTOM) - insets.bottom },
          ]}
        >
          {footer}
        </View>
      )}
    </SafeFrame>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  // The bar floats over the list: the list scrolls under it and is never cut off by it.
  over: { position: 'absolute', top: 0, left: 0, right: 0 },
  veil: { position: 'absolute', top: 0, left: 0 },
  barTitle: {
    flex: 1,
    textAlign: 'center',
    alignSelf: 'center',
    fontFamily: fonts.heading,
    fontWeight: '700',
  },
  corner: { width: CORNER.size, height: CORNER.size },
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xxl, gap: spacing.lg },
  footer: { paddingHorizontal: DOCK_GUTTER, paddingTop: spacing.sm },
  // The same heading the keeping tabs wear: it starts 24 points in, and shrinks towards its
  // leading edge, where the bar's small title will not be.
  title: {
    fontFamily: fonts.heading,
    fontWeight: '700',
    letterSpacing: -0.6,
    marginLeft: spacing.sm,
    transformOrigin: 'left center',
  },
});
