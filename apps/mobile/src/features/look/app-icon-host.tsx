import { useEffect } from 'react';
import { AppState } from 'react-native';

import * as AppIcon from '../../../modules/app-icon';

import { alternateName } from './icons';
import { useAppIcon } from './use-app-icon';

/**
 * Keeps the Home Screen icon the one the person's settings ask for. iOS shows its own alert
 * whenever an app changes its icon, so the change is only asked for while the app is in front,
 * only when the icon that is on is not already the right one, and never before the phone's own
 * settings have been read: at launch they are the defaults for a moment, and acting on those
 * would change the icon away and back, with the system's alert each time.
 */
export function AppIconHost() {
  const { icon, known } = useAppIcon();

  useEffect(() => {
    if (!known || !AppIcon.isSupported()) return undefined;
    const wanted = alternateName(icon);
    const apply = () => {
      if (AppState.currentState !== 'active' || AppIcon.current() === wanted) return;
      // A refusal leaves the icon as it was; the next change of mind asks again.
      void AppIcon.set(wanted).catch(() => undefined);
    };
    apply();
    const state = AppState.addEventListener('change', apply);
    return () => state.remove();
  }, [icon, known]);

  return null;
}
