import { useIsFocused, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { useLanguage } from '../../i18n/i18n-provider';
import { useToday } from '../../state/day-store-provider';
import { useKeepsakes, usePlus } from '../../state/keepsakes';
import { goBack } from '../../ui/motion/go-back';
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
  const { localDate } = useToday();
  const focused = useIsFocused();
  const { keepsakes } = useKeepsakes(focused);
  const plus = usePlus();
  const current = monthOf(localDate);
  const [shown, setShown] = useState(params.month ?? current);
  const pages = useMemo(
    () => monthPages(keepsakes?.monsters ?? [], localDate),
    [keepsakes, localDate],
  );

  useEffect(() => {
    if (!plus) goBack(router, '/zoo');
  }, [plus, router]);

  if (!keepsakes || !plus) return <View style={{ flex: 1, backgroundColor: palette.page }} />;
  const open = pages.some((page) => page.month === shown) ? shown : current;
  return (
    <PagesScreen
      model={{ pages, shown: open, current, language }}
      actions={{
        close: () => goBack(router, '/zoo'),
        show: setShown,
        openCard: (monster) => {
          lookAt(monster.id);
          router.push(cardRoute(monster.id, { month: monthOf(monster.caughtOn) }));
        },
      }}
    />
  );
}
