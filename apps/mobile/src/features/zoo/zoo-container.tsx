import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';

import { useLanguage } from '../../i18n/i18n-provider';
import { useToday } from '../../state/day-store-provider';
import { usePlus, type Keepsakes } from '../../state/keepsakes';
import { PLUS_SHEET } from '../plus/routes';
import { shareOfferedOn } from '../share/share-rules';
import { useShare } from '../share/use-share';

import { pageOfToday, shelfCards, wildOnes, type ShelfSort } from './binder';
import { cardRoute, pagesRoute } from './binder-routes';
import { lookAt, useLastLooked } from './last-looked';
import { ZooPane } from './zoo-pane';

export interface ZooTabProps {
  readonly keepsakes: Keepsakes;
  /** Whether the shelf is the tab in view. */
  readonly active: boolean;
}

/**
 * The binder's shelf on the real phone, as a tab. Every card is here for everyone; the other
 * three orders and the month pages are Plus, and without it a tap on one asks about Plus, except
 * on a day with something heavy in it, when nothing is sold and those controls rest.
 */
export function ZooTab({ keepsakes, active }: ZooTabProps) {
  const router = useRouter();
  const { language } = useLanguage();
  const { localDate, today, heavyToday } = useToday();
  const plus = usePlus();
  const lastLooked = useLastLooked();
  const [sort, setSort] = useState<ShelfSort>('newest');
  const { monsters, tasks } = keepsakes;
  const cards = useMemo(() => shelfCards(monsters, sort, plus), [monsters, sort, plus]);
  const crisis = today.kind === 'crisis';
  const wild = useMemo(
    () => wildOnes(monsters, tasks, localDate, crisis),
    [monsters, tasks, localDate, crisis],
  );
  const month = useMemo(() => pageOfToday(monsters, localDate), [monsters, localDate]);

  const plusDoor = {
    openPlus: () => router.push(PLUS_SHEET),
  };
  // Nothing sells near something heavy: on such a day the locked controls do nothing, here and
  // on the composer this shelf opens.
  const door: { readonly openPlus?: () => void } = { ...(heavyToday ? {} : plusDoor) };
  const share = useShare(today, door.openPlus);
  const [year = 0, monthNumber = 1] = month.month.split('-').map(Number);
  return (
    <ZooPane
      active={active}
      model={{ cards, wild, language, plus, sort, month, lastLooked }}
      actions={{
        openCard: (monster) => {
          lookAt(monster.id);
          router.push(cardRoute(monster.id, { sort }));
        },
        sort: setSort,
        ...door,
        // The month's page goes out as its poster, once something on it may be shared.
        ...(month.cards.length > 0 && !crisis
          ? { sharePage: () => share.open({ kind: 'month', year, month: monthNumber }) }
          : {}),
        // A monster still wild goes on a wanted poster, unless its task is private.
        shareWild: (one) => {
          const task = tasks.get(one.monster.taskId) ?? null;
          if (!task || !shareOfferedOn(today, task)) return;
          share.open({
            kind: 'wanted',
            task,
            wanted: {
              monster: one.monster.spec,
              name: one.monster.name,
              title: one.monster.title,
              day: one.day,
              since: Number(task.firstMentionedOn.slice(5, 7)),
            },
          });
        },
        ...(plus ? { openPages: () => router.push(pagesRoute()) } : {}),
      }}
    />
  );
}
