import { useLocalSearchParams, usePreventRemove, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { useLanguage } from '../../i18n/i18n-provider';
import { useToday } from '../../state/day-store-provider';
import { useKeepsakes, usePlus } from '../../state/keepsakes';
import { goBack } from '../../ui/motion/go-back';
import { SharePanel } from '../share/share-panel';
import { shareOfferedOn } from '../share/share-rules';
import { useShare } from '../share/use-share';

import { monthPages, shelfCards, SHELF_SORTS, type ShelfSort } from './binder';
import { CardScreen } from './card-screen';
import { lookAt } from './last-looked';
import { cardDataFor } from './zoo-cards';

const sortFrom = (value: unknown): ShelfSort =>
  SHELF_SORTS.includes(value as ShelfSort) ? (value as ShelfSort) : 'newest';

/**
 * One card out of its pocket, on the real phone. It is opened from the shelf, from a month's
 * page or from a resident of the world, and the arrows browse the cards it was opened among: the
 * shelf in the order it was in, or that month's page.
 */
export function CardContainer() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; sort?: string; month?: string }>();
  const { language } = useLanguage();
  const day = useToday();
  const { keepsakes } = useKeepsakes();
  const plus = usePlus();
  const share = useShare(language, day.today);
  const [shown, setShown] = useState(params.id ?? null);
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
  // The shelf underneath follows the card that is out, so it is there on the way back.
  useEffect(() => {
    if (shown !== null) lookAt(shown);
  }, [shown]);
  // The share panel is drawn over the card, not pushed: a swipe back closes it first.
  const { panel } = share;
  usePreventRemove(panel !== null, () => panel?.actions.close());

  if (!keepsakes) return <View style={{ flex: 1, backgroundColor: '#1C1A17' }} />;
  if (panel) return <SharePanel {...panel} />;
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
