import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { useLanguage } from '../../i18n/i18n-provider';
import { useToday } from '../../state/day-store-provider';
import { useKeepsakes, usePlus } from '../../state/keepsakes';
import { goBack } from '../../ui/motion/go-back';
import { PLUS_SHEET } from '../plus/routes';
import { shareOfferedOn } from '../share/share-rules';
import { useShare } from '../share/use-share';

import { cardOut, monthPages, shelfCards, SHELF_SORTS, type ShelfSort } from './binder';
import { CardScreen } from './card-screen';
import { lookAt } from './last-looked';
import { cardDataFor } from './zoo-cards';

const sortFrom = (value: unknown): ShelfSort =>
  SHELF_SORTS.includes(value as ShelfSort) ? (value as ShelfSort) : 'newest';

/**
 * One card out of its pocket, on the real phone. It is opened from the shelf, from a month's
 * page, from a resident of the world or from the caught card on the Lock Screen, and the arrows
 * browse the cards it was opened among: the shelf in the order it was in, or that month's page.
 */
export function CardContainer() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    task?: string;
    sort?: string;
    month?: string;
  }>();
  const { language } = useLanguage();
  const day = useToday();
  const { keepsakes } = useKeepsakes();
  const plus = usePlus();
  // A locked frame in the composer asks about Plus, except on a day with something heavy in it,
  // when nothing is sold and it rests.
  const plusDoor = {
    openPlus: () => router.push(PLUS_SHEET),
  };
  const door: { readonly openPlus?: () => void } = day.heavyToday ? {} : plusDoor;
  const share = useShare(day.today, door.openPlus);
  const [chosen, setShown] = useState(params.id ?? null);
  const sort = sortFrom(params.sort);
  const { month } = params;

  const cards = useMemo(() => {
    const monsters = keepsakes?.monsters ?? [];
    if (month) {
      const page = monthPages(monsters, day.localDate).find((one) => one.month === month);
      if (page) return page.cards;
    }
    return shelfCards(monsters, sort, plus);
  }, [keepsakes, month, sort, plus, day.localDate]);
  const shown = cardOut(cards, chosen, params.task ?? null);
  // The shelf underneath follows the card that is out, so it is there on the way back.
  useEffect(() => {
    if (shown !== null) lookAt(shown);
  }, [shown]);
  if (!keepsakes) return <View style={{ flex: 1, backgroundColor: '#1C1A17' }} />;
  const index = Math.max(
    0,
    cards.findIndex((card) => card.id === shown),
  );
  const monster = cards[index];
  const task = monster ? (keepsakes.tasks.get(monster.taskId) ?? null) : null;
  return (
    <CardScreen
      model={{
        cards,
        index,
        taskLine: task ? task.text.slice(0, 280) : null,
        language,
        shareOffered: monster !== undefined && shareOfferedOn(day.today, task),
      }}
      actions={{
        close: () => goBack(router, '/zoo'),
        show: (next) => setShown(cards[next]?.id ?? shown),
        share: () => {
          if (!monster) return;
          share.open({
            task,
            card: cardDataFor(monster, task),
            signed: monster.signed ?? null,
            // The composer opens on the story of the catch; the turning card is one format over.
            format: 'story',
          });
        },
      }}
    />
  );
}
