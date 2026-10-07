import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { useLanguage } from '../../i18n/i18n-provider';
import { openRepositories } from '../../data/repositories';
import { useToday } from '../../state/day-store-provider';
import { useKeepsakes, usePlus } from '../../state/keepsakes';
import { useScreenStyle } from '../../ui/use-screen-style';
import { finishOpen } from '../plus/finish-picker';
import { PLUS_SHEET } from '../plus/routes';
import { SharePanel } from '../share/share-panel';
import { shareOfferedOn } from '../share/share-rules';
import { useShare } from '../share/use-share';

import { cardDataFor, zooCards, type BinderSort, type CaughtMonster } from './zoo-cards';
import { sortAfter, ZooScreen } from './zoo-screen';

/** The zoo on the real phone. */
export function ZooContainer() {
  const router = useRouter();
  const { language } = useLanguage();
  const { palette } = useScreenStyle();
  const db = useSQLiteContext();
  const [finishes, setFinishes] = useState(0);
  const { keepsakes } = useKeepsakes(finishes);
  const plus = usePlus();
  const { today } = useToday();
  const share = useShare(language, today);
  const [sort, setSort] = useState<BinderSort | null>(null);
  const [opened, setOpened] = useState<CaughtMonster | null>(null);
  const cards = useMemo(
    () => zooCards(keepsakes?.monsters ?? [], plus, sort),
    [keepsakes, plus, sort],
  );

  if (!keepsakes) return <View style={{ flex: 1, backgroundColor: palette.page }} />;
  if (share.panel) return <SharePanel {...share.panel} />;
  // The open card is read from storage again after a finish is chosen.
  const shown = opened ? (cards.find((monster) => monster.id === opened.id) ?? opened) : null;
  const task = shown ? (keepsakes.tasks.get(shown.taskId) ?? null) : null;
  const card = shown ? cardDataFor(shown, task) : null;
  return (
    <ZooScreen
      model={{
        cards,
        language,
        plus,
        sort,
        open: card ? { card, shareOffered: shareOfferedOn(today, task) } : null,
      }}
      actions={{
        close: () => router.dismissTo('/world'),
        openCard: setOpened,
        closeCard: () => setOpened(null),
        nextSort: () => setSort(sortAfter),
        openPlus: () => router.push(PLUS_SHEET),
        setFinish: (finish) => {
          // The entitlement decides again here, whatever the picker drew.
          if (!shown || !finishOpen(finish, plus, shown.finish)) return;
          void openRepositories(db)
            .monsters.put({ ...shown, finish })
            .then(() => setFinishes((count) => count + 1))
            .catch(() => undefined);
        },
        shareCard: () => {
          if (card) share.open({ task, card, signed: shown?.signed ?? null, kind: 'card' });
        },
      }}
    />
  );
}
