import { Stack, useRoute } from 'expo-router';
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
  return (
    <>
      <Stack.Screen options={{ title: title ?? '' }} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.View hidesSharedBackground>
          <CloseButton {...close} />
        </Stack.Toolbar.View>
      </Stack.Toolbar>
    </>
  );
}
