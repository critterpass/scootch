import { Stack, useRoute } from 'expo-router';
import { useMemo, useRef } from 'react';
import { Platform } from 'react-native';

import { CloseButton, type CloseButtonProps } from './corner-bar';
import { routeBar, type RouteBar } from './motion/stack-transitions';

/**
 * The system bar the screen being drawn wears, from the route it is drawn in. A screen shown
 * anywhere else (a registry capture, a sheet) wears none and draws its own corner controls.
 */
export function useRouteBar(): RouteBar {
  const route = useRoute();
  return routeBar(route.name, Platform.OS === 'ios');
}

export interface NativeBarProps {
  /** The bar's title. A page with a large title shows it large, and small once it has scrolled. */
  readonly title?: string;
  readonly close: CloseButtonProps;
}

/**
 * Fills in the system's navigation bar for the screen it is rendered in: the title, and the close
 * control as the bar's trailing item. The bar places the item itself, so it is in the same spot on
 * every screen and stays there while one screen slides over another. The control is the app's own
 * round glass button rather than a plain bar button, because a bar button cannot carry the
 * identifier the device walks find it by; the bar's shared background is hidden under it, so glass
 * is never drawn on glass.
 */
export function NativeBar({ title, close }: NativeBarProps) {
  const { label, hint, testID } = close;
  const latestPress = useRef(close.onPress);
  latestPress.current = close.onPress;
  // The toolbar writes its item into the stack's options whenever the item is a new element. A
  // screen that reads those options (the world does, for its swipe back) is drawn again by that
  // write, so an item made on every draw never settles. It is made again only when it differs.
  const item = useMemo(
    () => (
      <Stack.Toolbar.View hidesSharedBackground>
        <CloseButton
          label={label}
          hint={hint}
          testID={testID}
          onPress={() => latestPress.current()}
        />
      </Stack.Toolbar.View>
    ),
    [label, hint, testID],
  );
  const options = useMemo(() => ({ title: title ?? '' }), [title]);
  return (
    <>
      <Stack.Screen options={options} />
      <Stack.Toolbar placement="right">{item}</Stack.Toolbar>
    </>
  );
}
