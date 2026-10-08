import { useCallback, useMemo } from 'react';

import type { CardFinish } from '@scootch/domain';

import { useToday } from '../../state/day-store-provider';
import { usePlusState } from '../../state/plus-context';
import { FINISHES } from '../studio/catalogue';
import { mayWear } from '../studio/rules';

import { iconFor, mayShow, type AppIconName, type IconFacts } from './icons';

/**
 * The icon the person's settings ask for, and who may show which: read from the same settings,
 * look and purchases everywhere, so Settings, the picker and the Home Screen never disagree.
 */
export function useAppIcon() {
  const { settings, ready } = useToday();
  const { customer, unlocked, look, loaded } = usePlusState();
  const { attitude, iconFollows, iconPinned } = settings;
  const { finish } = look;
  const { ownedItems } = customer;
  const { capabilities } = unlocked;

  const wear = useCallback(
    (id: CardFinish) => {
      const item = FINISHES.find((one) => one.id === id);
      return item !== undefined && mayWear(item, { ownedItems, capabilities });
    },
    [ownedItems, capabilities],
  );
  return useMemo(() => {
    const facts = (follows: IconFacts['settings']['iconFollows']): IconFacts => ({
      settings: { attitude, iconFollows: follows, iconPinned },
      finish,
      mayWear: wear,
    });
    return {
      /**
       * False until the settings and the look have been read from the phone. Before that they
       * are the defaults, and an icon chosen from them would be the wrong one for a moment.
       */
      known: ready && loaded,
      icon: iconFor(facts(iconFollows)),
      follows: iconFollows,
      finish,
      /** The icon each way of following would put on. */
      iconOf: {
        attitude: iconFor(facts('attitude')),
        finish: iconFor(facts('finish')),
        pinned: iconFor(facts('pinned')),
      },
      mayShow: (icon: AppIconName) => mayShow(icon, wear),
    };
  }, [attitude, iconFollows, iconPinned, finish, wear, ready, loaded]);
}
