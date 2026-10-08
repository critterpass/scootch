import { useEffect } from 'react';
import { AppState } from 'react-native';

import type { CardFinish } from '@scootch/domain';

import * as AppIcon from '../../../modules/app-icon';
import { useToday } from '../../state/day-store-provider';
import { usePlusState } from '../../state/plus-context';
import { FINISHES } from '../studio/catalogue';
import { mayWear } from '../studio/rules';

import { alternateName, iconFor } from './icons';

/**
 * Keeps the Home Screen icon the one the person's settings ask for. iOS shows its own alert
 * whenever an app changes its icon, so the change is only asked for while the app is in front,
 * and only when the icon that is on is not already the right one.
 */
export function AppIconHost() {
  const { settings } = useToday();
  const { customer, unlocked, look } = usePlusState();
  const { attitude, iconFollows, iconPinned } = settings;
  const { finish } = look;
  const { ownedItems } = customer;
  const { capabilities } = unlocked;

  useEffect(() => {
    if (!AppIcon.isSupported()) return undefined;
    const wear = (id: CardFinish) => {
      const item = FINISHES.find((one) => one.id === id);
      return item !== undefined && mayWear(item, { ownedItems, capabilities });
    };
    const wanted = alternateName(
      iconFor({ settings: { attitude, iconFollows, iconPinned }, finish, mayWear: wear }),
    );
    const apply = () => {
      if (AppState.currentState !== 'active' || AppIcon.current() === wanted) return;
      // A refusal leaves the icon as it was; the next change of mind asks again.
      void AppIcon.set(wanted).catch(() => undefined);
    };
    apply();
    const state = AppState.addEventListener('change', apply);
    return () => state.remove();
  }, [attitude, iconFollows, iconPinned, finish, ownedItems, capabilities]);

  return null;
}
