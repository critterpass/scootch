import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { Linking } from 'react-native';

import { localDateTime } from '@scootch/domain';

import { useLanguage } from '../../i18n/i18n-provider';
import { useToday } from '../../state/day-store-provider';
import { plusLine } from '../../state/lines';
import { usePlusRuntime } from '../../state/plus-context';

import { PlusSheet } from './plus-sheet';
import { LEGAL_LINKS } from './products';
import { PLUS_MANAGE, PLUS_WELCOME } from './routes';
import { createSheetController } from './sheet-controller';
import { sheetLineSlot } from './sheet-model';

const open = (url: string) => void Linking.openURL(url).catch(() => undefined);

/** The sheet on the real phone: the store behind it, and where a purchase leads. */
export function PlusSheetContainer() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { language } = useLanguage();
  const day = useToday();
  const { settings } = day;
  const runtime = usePlusRuntime();
  const { port, store } = runtime;
  const controller = useMemo(() => createSheetController({ port, store }), [port, store]);
  const state = useSyncExternalStore(controller.subscribe, controller.getState);

  useEffect(() => {
    void controller.open();
  }, [controller]);

  const done = state.done;
  useEffect(() => {
    if (!done) return;
    // A purchase is met by the card arriving; a restore goes straight to the card it brought back.
    router.replace(done.restored ? PLUS_MANAGE : PLUS_WELCOME);
  }, [done, router]);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  return (
    <PlusSheet
      attitude={settings.attitude}
      said={plusLine(
        sheetLineSlot(from === 'one-more' ? 'one_more' : 'asked'),
        { language, attitude: settings.attitude },
        day,
      )}
      year={localDateTime(runtime.now(), runtime.timeZone()).date.slice(0, 4)}
      state={state}
      actions={{
        close,
        choose: controller.choose,
        buy: () => void controller.buy(),
        restore: () => void controller.restore(),
        openTerms: () => open(LEGAL_LINKS.terms),
        openPrivacy: () => open(LEGAL_LINKS.privacy),
      }}
    />
  );
}
