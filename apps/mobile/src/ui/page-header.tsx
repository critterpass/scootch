import { Stack } from 'expo-router';
import { Platform } from 'react-native';

import { useScreenStyle } from './use-screen-style';

/** From iOS 26 the bar is Liquid Glass: the system draws its own edge over what scrolls under it. */
const GLASS_BAR = Platform.OS === 'ios' && Number.parseInt(String(Platform.Version), 10) >= 26;

/**
 * The system's navigation bar on a pushed page: its title large at the top of the page, shrinking
 * into the bar as the page scrolls, with the bar see-through and the page frosted under it, and the
 * system's own way back. The page's scroll view is its first child and adjusts its insets
 * automatically, so its first row starts under the large title.
 *
 * It is drawn by the screen itself, so the page has its bar wherever it is shown, a capture too.
 */
export function PageHeader({ title }: { readonly title: string }) {
  const { palette } = useScreenStyle();
  return (
    <Stack.Screen
      options={{
        headerShown: true,
        title,
        headerLargeTitleEnabled: true,
        headerTransparent: true,
        // Before Liquid Glass the frosted bar is the system's chrome material; on glass the system
        // draws its own scroll edge, and a blur as well would lie twice over the page.
        ...(GLASS_BAR ? {} : { headerBlurEffect: 'systemChromeMaterial' as const }),
        headerLargeTitleShadowVisible: false,
        headerLargeStyle: { backgroundColor: 'transparent' },
        headerBackButtonDisplayMode: 'minimal',
        headerTintColor: palette.ink,
        headerTitleStyle: { color: palette.ink },
        headerLargeTitleStyle: { color: palette.ink, fontWeight: '800' },
      }}
    />
  );
}
