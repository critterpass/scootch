import { useIsFocused, useLocalSearchParams, usePreventRemove, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { useLanguage } from '../../i18n/i18n-provider';
import { useToday } from '../../state/day-store-provider';
import { useKeepsakes, usePlus } from '../../state/keepsakes';
import { goBack } from '../../ui/motion/go-back';
import { SharePanel } from '../share/share-panel';
import { useShare } from '../share/use-share';
import { useScreenStyle } from '../../ui/use-screen-style';

import { monthOf, monthPages } from './binder';
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
  const [shown, setShown] = useState(params.month ?? current);
  const share = useShare(language, today);
  // The composer is drawn over the page, not pushed: a swipe back closes it first.
  const { panel } = share;
  usePreventRemove(panel !== null, () => panel?.actions.close());
  const pages = useMemo(
    () => monthPages(keepsakes?.monsters ?? [], localDate),
    [keepsakes, localDate],
  );

  useEffect(() => {
    if (!plus) goBack(router, '/zoo');
  }, [plus, router]);

  if (!keepsakes || !plus) return <View style={{ flex: 1, backgroundColor: palette.page }} />;
  if (panel) return <SharePanel {...panel} />;
  const open = pages.some((page) => page.month === shown) ? shown : current;
  const openPage = pages.find((page) => page.month === open);
  const [year = 0, month = 1] = open.split('-').map(Number);
  return (
    <PagesScreen
      model={{ pages, shown: open, current, language }}
      actions={{
        close: () => goBack(router, '/zoo'),
        show: setShown,
        // The page goes out as that month's poster, once there is something on it.
        ...(openPage && openPage.cards.length > 0 && today.kind !== 'crisis'
          ? { sharePage: () => share.open({ kind: 'month', year, month }) }
          : {}),
        openCard: (monster) => {
          lookAt(monster.id);
          router.push(cardRoute(monster.id, { month: monthOf(monster.caughtOn) }));
        },
      }}
    />
  );
}
