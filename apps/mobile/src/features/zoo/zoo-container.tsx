import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { useLanguage } from '../../i18n/i18n-provider';
import { useToday } from '../../state/day-store-provider';
import { useScreenStyle } from '../../ui/use-screen-style';
import { PLUS_SHEET } from '../plus/routes';
import { SharePanel } from '../share/share-panel';

import { useOpenedCard } from './use-opened-card';
import { zooCards, type BinderSort } from './zoo-cards';
import { sortAfter, ZooScreen } from './zoo-screen';

/** The zoo on the real phone. */
export function ZooContainer() {
  const router = useRouter();
  const { language } = useLanguage();
  const { palette } = useScreenStyle();
  const { localDate, heavyToday } = useToday();
  const opened = useOpenedCard();
  const { keepsakes, plus, shown } = opened;
  const [sort, setSort] = useState<BinderSort | null>(null);
  const cards = useMemo(
    () => zooCards(keepsakes?.monsters ?? [], plus, sort),
    [keepsakes, plus, sort],
  );

  const plusDoor = {
    openPlus: () => router.push(PLUS_SHEET),
  };
  if (!keepsakes) return <View style={{ flex: 1, backgroundColor: palette.page }} />;
  if (opened.sharePanel) return <SharePanel {...opened.sharePanel} />;
  return (
    <ZooScreen
      model={{
        cards,
        language,
        plus,
        sort,
        today: localDate,
        open: shown ? { card: shown.card, shareOffered: shown.shareOffered } : null,
      }}
      actions={{
        close: () => router.dismissTo('/world'),
        openCard: (monster) => opened.open(monster.id),
        closeCard: opened.close,
        nextSort: () => setSort(sortAfter),
        // Nothing sells near something heavy: on such a day the locked controls do nothing.
        ...(heavyToday ? {} : plusDoor),
        setFinish: (finish) => shown?.setFinish(finish),
        shareCard: () => shown?.share(),
        shareMonster: (monster) => {
          if (!opened.shareOf(monster)) opened.open(monster.id);
        },
      }}
    />
  );
}
