import { useRoute } from 'expo-router';

import { routeMotion } from './motion/stack-transitions';

/**
 * Whether the screen being drawn was opened as a sheet. A sheet is already under the status bar:
 * it keeps clear of its own top edge, never of the window's.
 */
export function useRouteSheet(): boolean {
  const motion = routeMotion(useRoute().name);
  return motion === 'sheet' || motion === 'fitted';
}
