import { useIsFocused, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { useLanguage } from '../../i18n/i18n-provider';
import { useToday } from '../../state/day-store-provider';
import { useKeepsakes, usePlus } from '../../state/keepsakes';
import { showsSelling } from '../../state/shows-comedy';
import { goBack } from '../../ui/motion/go-back';
import { useScreenStyle } from '../../ui/use-screen-style';
import { PLUS_SHEET } from '../plus/routes';

import { pageOfToday, shelfCards, sortNeedsPlus, wildOnes, type ShelfSort } from './binder';
import { cardRoute, pagesRoute } from './binder-routes';
import { lookAt, useLastLooked } from './last-looked';
import { ZooScreen } from './zoo-screen';

/**
 * The binder's shelf on the real phone. Every card is here for everyone; the other three orders
 * and the month pages are Plus, and without it a tap on one asks about Plus, except on a day with
 * something heavy in it, when nothing is sold and those controls rest.
 */
export function ZooContainer() {
  const router = useRouter();
  const { language } = useLanguage();
  const { palette } = useScreenStyle();
  const day = useToday();
  // Read again whenever the shelf comes back into view: a catch may have happened since.
  const focused = useIsFocused();
  const { keepsakes } = useKeepsakes(focused);
  const plus = usePlus();
  const lastLooked = useLastLooked();
  const [sort, setSort] = useState<ShelfSort>('newest');
  const monsters = keepsakes?.monsters;
  const cards = useMemo(() => shelfCards(monsters ?? [], sort, plus), [monsters, sort, plus]);
  const crisis = day.today.kind === 'crisis';
  const wild = useMemo(
    () => (keepsakes ? wildOnes(keepsakes.monsters, keepsakes.tasks, day.localDate, crisis) : []),
    [keepsakes, day.localDate, crisis],
  );
  const month = useMemo(
    () => pageOfToday(monsters ?? [], day.localDate),
    [monsters, day.localDate],
  );

  if (!keepsakes) return <View style={{ flex: 1, backgroundColor: palette.page }} />;
  const selling = showsSelling(day);
  const askAboutPlus = () => {
    if (selling) router.push(PLUS_SHEET);
  };
  const toWorld = () => goBack(router, '/world');
  return (
    <ZooScreen
      model={{ cards, wild, language, plus, sort, month, lastLooked }}
      actions={{
        // Back to the world it was opened from, whether that is a page beside home or a screen.
        close: toWorld,
        openWorld: toWorld,
        openCard: (monster) => {
          lookAt(monster.id);
          router.push(cardRoute(monster.id, { sort }));
        },
        sort: (next) => {
          if (sortNeedsPlus(next) && !plus) askAboutPlus();
          else setSort(next);
        },
        ...(plus
          ? { openPages: () => router.push(pagesRoute()) }
          : selling
            ? { openPages: askAboutPlus }
            : {}),
      }}
    />
  );
}
