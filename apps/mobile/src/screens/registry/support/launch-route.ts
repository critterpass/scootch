import { useRootNavigationState, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform, Settings } from 'react-native';

import { developerToolsAllowed } from './developer-tools';

/** The launch argument naming the developer screen to open: `-openDeveloperScreen /registry`. */
const LAUNCH_KEY = 'openDeveloperScreen';

/**
 * The developer screen this launch was asked to open, if any. iOS keeps a launch argument in the
 * app's settings for that launch only, so nothing carries over to the next. Device runs launch
 * the developer screens this way rather than by their link, whose system prompt and hand-off are
 * slow enough on a hosted simulator to arrive after the flow has given up on them.
 */
export function launchRoute(): string | null {
  if (Platform.OS !== 'ios' || !developerToolsAllowed()) return null;
  let value: unknown;
  try {
    value = Settings.get(LAUNCH_KEY);
  } catch {
    return null;
  }
  return typeof value === 'string' && value.startsWith('/') ? value : null;
}

/** Opens the developer screen named at launch, once, as soon as the navigator is up. */
export function useLaunchRoute(): void {
  const router = useRouter();
  const navigation = useRootNavigationState();
  const opened = useRef(false);
  const ready = navigation?.key !== undefined;
  useEffect(() => {
    if (opened.current || !ready) return;
    opened.current = true;
    const route = launchRoute();
    if (route !== null) router.replace(route);
  }, [ready, router]);
}
