import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { fonts, spacing } from '@scootch/tokens';

import { useT } from '../../i18n/i18n-provider';
import { SafeFrame } from '../../ui/safe-frame';
import { BackButton, CloseButton, CornerBar, MenuButton } from '../../ui/corner-bar';
import { NativeBar, useRouteBar } from '../../ui/native-bar';
import { useScreenStyle } from '../../ui/use-screen-style';

const TITLE_SIZE = 34;
/** From the bottom of the screen up to a dock, and the dock's gutter, as the boards draw them. */
const DOCK_BOTTOM = 30;
const DOCK_GUTTER = 14;
const BAR_TITLE_SIZE = 17;
/** How far a page scrolls before its large title has gone up into the bar. */
const COLLAPSES_BY = 52;
/** How far the title grows when the page is pulled down past its top, and over what pull. */
const STRETCH = { by: 1.08, over: 90 } as const;

export interface PageProps {
  /**
   * The large title of a page under Settings. It scrolls with the page, shrinking and fading as
   * it goes, and the bar takes it up small once it has gone. Left out, the small centred title
   * is shown from the start.
   */
  readonly title?: string;
  readonly barTitle?: string;
  readonly onClose: () => void;
  readonly testID: string;
  /**
   * The page's own menu. With one, the way back sits in the leading corner and the menu in the
   * trailing one.
   */
  readonly menu?: { readonly label: string; readonly hint: string; readonly onPress: () => void };
  /** The page's actions, in a dock that stays at the bottom while the page scrolls above it. */
  readonly footer?: ReactNode;
  readonly children: ReactNode;
}

/**
 * A plain page of rows: a close button, a title, and a list that scrolls at any text size. It is
 * drawn two ways from the route it is in: under the system's bar, or with its own corner bar.
 */
export function Page({ title, barTitle, onClose, testID, menu, footer, children }: PageProps) {
  const { palette, allowFontScaling, size, reducedMotion } = useScreenStyle();
  const t = useT();
  const insets = useSafeAreaInsets();
  const bar = useRouteBar();

  // The large title rides the scroll on the UI thread. Once it has gone, the bar is told, once.
  const scrolled = useSharedValue(0);
  const [collapsed, setCollapsed] = useState(false);
  const follow = useAnimatedScrollHandler((event) => {
    scrolled.value = event.contentOffset.y;
  });
  useAnimatedReaction(
    () => scrolled.value > COLLAPSES_BY,
    (gone, before) => {
      if (gone !== before) scheduleOnRN(setCollapsed, gone);
    },
  );
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

  // The board's 30 points under a dock, never less than the home bar's own clear space. `kept` is
  // the part of that space the frame around the page already keeps clear.
  const dockOver = (kept: number) =>
    footer === undefined ? null : (
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, DOCK_BOTTOM) - kept }]}>
        {footer}
      </View>
    );
  const close = {
    label: t('settings.close'),
    hint: t('settings.close.hint'),
    onPress: onClose,
    testID: `${testID}-close`,
  };
  const menuItem = menu === undefined ? undefined : { ...menu, testID: `${testID}-menu` };
  const large =
    title === undefined ? null : (
      <Animated.Text
        accessibilityRole="header"
        allowFontScaling={allowFontScaling}
        style={[styles.title, { color: palette.ink, fontSize: size(TITLE_SIZE) }, riding]}
      >
        {title}
      </Animated.Text>
    );
  const list = (
    <Animated.ScrollView
      onScroll={follow}
      scrollEventThrottle={16}
      contentContainerStyle={styles.content}
      testID={`${testID}-list`}
    >
      {large}
      {children}
    </Animated.ScrollView>
  );

  // Under the system's bar the close control is the bar's, and so is the small title: a page with
  // a large one hands it over once the large one has scrolled away.
  if (bar === 'page') {
    return (
      <View style={[styles.page, { backgroundColor: palette.page }]} testID={testID}>
        <NativeBar
          title={title === undefined ? (barTitle ?? '') : collapsed ? title : ''}
          close={close}
          menu={menuItem}
        />
        {list}
        {dockOver(0)}
      </View>
    );
  }
  const small = barTitle ?? title;
  return (
    <SafeFrame style={[styles.page, { backgroundColor: palette.page }]} testID={testID}>
      <CornerBar
        {...(menuItem === undefined
          ? { trailing: <CloseButton {...close} /> }
          : { leading: <BackButton {...close} />, trailing: <MenuButton {...menuItem} /> })}
      >
        {small === undefined ? null : (
          <Animated.Text
            accessibilityRole={title === undefined ? 'header' : 'none'}
            allowFontScaling={allowFontScaling}
            numberOfLines={1}
            style={[
              styles.barTitle,
              // With a control in each corner the title is already centred between them.
              menuItem !== undefined && styles.between,
              { color: palette.ink, fontSize: size(BAR_TITLE_SIZE) },
              title === undefined ? null : taken,
            ]}
          >
            {small}
          </Animated.Text>
        )}
      </CornerBar>
      {list}
      {dockOver(insets.bottom)}
    </SafeFrame>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  barTitle: {
    flex: 1,
    textAlign: 'center',
    // The close control is in the trailing corner: the title is centred on the screen beside it.
    marginLeft: 44,
    alignSelf: 'center',
    fontFamily: fonts.heading,
    fontWeight: '700',
  },
  between: { marginLeft: 0 },
  content: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.lg },
  footer: { paddingHorizontal: DOCK_GUTTER, paddingTop: spacing.sm },
  // The title shrinks towards its leading edge, where the bar's small one will not be: it fades
  // out before it gets there.
  title: {
    fontFamily: fonts.heading,
    fontWeight: '700',
    letterSpacing: -0.6,
    transformOrigin: 'left center',
  },
});
