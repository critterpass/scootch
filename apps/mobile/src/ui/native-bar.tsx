import { Stack, useRoute } from 'expo-router';
import { useMemo, useRef } from 'react';
import { Platform } from 'react-native';

import { BackButton, CloseButton, MenuButton, type CloseButtonProps } from './corner-bar';
import { routeBar, routeMotion, type RouteBar } from './motion/stack-transitions';

/**
 * The system bar the screen being drawn wears, from the route it is drawn in. A screen shown
 * anywhere else (a registry capture, a sheet) wears none and draws its own corner controls.
 */
export function useRouteBar(): RouteBar {
  const route = useRoute();
  return routeBar(route.name, Platform.OS === 'ios');
}

/** Whether the screen being drawn was opened as a sheet, which has its own top edge and grabber. */
export function useRouteSheet(): boolean {
  return routeMotion(useRoute().name) === 'sheet';
}

export interface NativeBarProps {
  /** The bar's title. A page with a large title shows it large, and small once it has scrolled. */
  readonly title?: string;
  readonly close: CloseButtonProps;
  /**
   * The screen's own menu. With one, the bar has two items: the way back in the leading corner
   * and the menu in the trailing one, so the two never stack in one corner.
   */
  readonly menu?: CloseButtonProps | undefined;
}

/**
 * Fills in the system's navigation bar for the screen it is rendered in: the title, and the close
 * control as the bar's trailing item. The bar places the item itself, so it is in the same spot on
 * every screen and stays there while one screen slides over another. The control is the app's own
 * round glass button rather than a plain bar button, because a bar button cannot carry the
 * identifier the device walks find it by; the bar's shared background is hidden under it, so glass
 * is never drawn on glass.
 */
export function NativeBar({ title, close, menu }: NativeBarProps) {
  const { label, hint, testID } = close;
  const latestPress = useRef(close.onPress);
  latestPress.current = close.onPress;
  const latestMenu = useRef(menu?.onPress);
  latestMenu.current = menu?.onPress;
  const hasMenu = menu !== undefined;
  const [menuLabel, menuHint, menuID] = [menu?.label ?? '', menu?.hint ?? '', menu?.testID ?? ''];
  // The toolbar writes its item into the stack's options whenever the item is a new element. A
  // screen that reads those options (the world does, for its swipe back) is drawn again by that
  // write, so an item made on every draw never settles. It is made again only when it differs.
  const item = useMemo(() => {
    const Way = hasMenu ? BackButton : CloseButton;
    return (
      <Stack.Toolbar.View hidesSharedBackground>
        <Way label={label} hint={hint} testID={testID} onPress={() => latestPress.current()} />
      </Stack.Toolbar.View>
    );
  }, [hasMenu, label, hint, testID]);
  const menuItem = useMemo(
    () =>
      hasMenu ? (
        <Stack.Toolbar.View hidesSharedBackground>
          <MenuButton
            label={menuLabel}
            hint={menuHint}
            testID={menuID}
            onPress={() => latestMenu.current?.()}
          />
        </Stack.Toolbar.View>
      ) : null,
    [hasMenu, menuLabel, menuHint, menuID],
  );
  const options = useMemo(() => ({ title: title ?? '' }), [title]);
  return (
    <>
      <Stack.Screen options={options} />
      {menuItem === null ? (
        <Stack.Toolbar placement="right">{item}</Stack.Toolbar>
      ) : (
        <>
          <Stack.Toolbar placement="left">{item}</Stack.Toolbar>
          <Stack.Toolbar placement="right">{menuItem}</Stack.Toolbar>
        </>
      )}
    </>
  );
}
