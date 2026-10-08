import { useEffect } from 'react';
import { AppState } from 'react-native';

import * as AppIcon from '../../../modules/app-icon';

import { alternateName } from './icons';
import { useAppIcon } from './use-app-icon';

/**
 * Keeps the Home Screen icon the one the person's settings ask for. iOS shows its own alert
 * whenever an app changes its icon, so the change is only asked for while the app is in front,
 * and only when the icon that is on is not already the right one.
 */
export function AppIconHost() {
  const { icon } = useAppIcon();

  useEffect(() => {
    if (!AppIcon.isSupported()) return undefined;
    const wanted = alternateName(icon);
    const apply = () => {
      if (AppState.currentState !== 'active' || AppIcon.current() === wanted) return;
      // A refusal leaves the icon as it was; the next change of mind asks again.
      void AppIcon.set(wanted).catch(() => undefined);
    };
    apply();
    const state = AppState.addEventListener('change', apply);
    return () => state.remove();
  }, [icon]);

  return null;
}
