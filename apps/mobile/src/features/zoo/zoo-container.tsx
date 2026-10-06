import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { useLanguage } from '../../i18n/i18n-provider';
import { useKeepsakes, usePlus } from '../../state/keepsakes';
import { useScreenStyle } from '../../ui/use-screen-style';
import { SharePanel } from '../share/share-panel';
import { shareOffered } from '../share/share-rules';
import { useShare } from '../share/use-share';

import { cardDataFor, zooCards, type BinderSort, type CaughtMonster } from './zoo-cards';
import { sortAfter, ZooScreen } from './zoo-screen';

/** The zoo on the real phone. */
export function ZooContainer() {
  const router = useRouter();
  const { language } = useLanguage();
  const { palette } = useScreenStyle();
  const { keepsakes } = useKeepsakes();
  const plus = usePlus();
  const share = useShare(language);
  const [sort, setSort] = useState<BinderSort | null>(null);
  const [opened, setOpened] = useState<CaughtMonster | null>(null);
  const cards = useMemo(
    () => zooCards(keepsakes?.monsters ?? [], plus, sort),
    [keepsakes, plus, sort],
  );

  if (!keepsakes) return <View style={{ flex: 1, backgroundColor: palette.page }} />;
  if (share.panel) return <SharePanel {...share.panel} />;
  const task = opened ? (keepsakes.tasks.get(opened.taskId) ?? null) : null;
  const card = opened ? cardDataFor(opened, task) : null;
  return (
    <ZooScreen
      model={{
        cards,
        language,
        plus,
        sort,
        open: card ? { card, shareOffered: shareOffered(task) } : null,
      }}
      actions={{
        close: () => router.replace('/world'),
        openCard: setOpened,
        closeCard: () => setOpened(null),
        nextSort: () => setSort(sortAfter),
        shareCard: () => {
          if (card) share.open({ task, card, kind: 'card' });
        },
      }}
    />
  );
}
