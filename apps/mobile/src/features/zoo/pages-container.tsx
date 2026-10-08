import { useIsFocused, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { useLanguage } from '../../i18n/i18n-provider';
import { useToday } from '../../state/day-store-provider';
import { useKeepsakes, usePlus } from '../../state/keepsakes';
import { goBack } from '../../ui/motion/go-back';
import { useShare } from '../share/use-share';
import { useScreenStyle } from '../../ui/use-screen-style';

import { monthOf, monthPages, type LeafAt } from './binder';
import { cardRoute } from './binder-routes';
import { lookAt } from './last-looked';
import { PagesScreen } from './pages-screen';

/**
 * The month pages on the real phone. They are part of Plus: opened without it (a link, or Plus
 * ending while they are up) they close back to the shelf, where every card still is.
 */
export function PagesContainer() {
  const router = useRouter();
  const params = useLocalSearchParams<{ month?: string }>();
  const { language } = useLanguage();
  const { palette } = useScreenStyle();
  const { localDate, today } = useToday();
  const focused = useIsFocused();
  const { keepsakes } = useKeepsakes(focused);
  const plus = usePlus();
  const current = monthOf(localDate);
  const [shown, setShown] = useState<LeafAt>({ month: params.month ?? current, leaf: 0 });
  // The pages are Plus, and Plus wears every frame: the composer has nothing locked to ask about.
  const share = useShare(today);
  const pages = useMemo(
    () => monthPages(keepsakes?.monsters ?? [], localDate),
    [keepsakes, localDate],
  );

  useEffect(() => {
    if (!plus) goBack(router, '/zoo');
  }, [plus, router]);

  if (!keepsakes || !plus) return <View style={{ flex: 1, backgroundColor: palette.page }} />;
  const open = pages.some((page) => page.month === shown.month)
    ? shown
    : { month: current, leaf: 0 };
  const openPage = pages.find((page) => page.month === open.month);
  const [year = 0, month = 1] = open.month.split('-').map(Number);
  return (
    <PagesScreen
      model={{ pages, shown: open, current, language }}
      actions={{
        close: () => goBack(router, '/zoo'),
        show: setShown,
        // The leaf that is open goes out, or the month's poster, once there is something on it.
        ...(openPage && openPage.cards.length > 0 && today.kind !== 'crisis'
          ? { sharePage: () => share.open({ kind: 'month', year, month, leaf: open.leaf }) }
          : {}),
        openCard: (monster) => {
          lookAt(monster.id);
          router.push(cardRoute(monster.id, { month: monthOf(monster.caughtOn) }));
        },
      }}
    />
  );
}
