import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { Linking } from 'react-native';

import { useLanguage } from '../../i18n/i18n-provider';
import { useToday } from '../../state/day-store-provider';
import { lineWithNoTask } from '../../state/lines';
import { usePlusRuntime } from '../../state/plus-context';

import { PlusSheet } from './plus-sheet';
import { LEGAL_LINKS } from './products';
import { PLUS_LIFETIME, PLUS_MANAGE, PLUS_TRIAL_STARTED } from './routes';
import { createSheetController } from './sheet-controller';
import { sheetLineSlot } from './sheet-model';

const open = (url: string) => void Linking.openURL(url).catch(() => undefined);

/** The sheet on the real phone: the store behind it, and where a purchase leads. */
export function PlusSheetContainer() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { language } = useLanguage();
  const { settings } = useToday();
  const { port, store } = usePlusRuntime();
  const controller = useMemo(() => createSheetController({ port, store }), [port, store]);
  const state = useSyncExternalStore(controller.subscribe, controller.getState);

  useEffect(() => {
    void controller.open();
  }, [controller]);

  const done = state.done;
  useEffect(() => {
    if (!done) return;
    if (done.plan === 'lifetime') router.replace(PLUS_LIFETIME);
    else if (done.customer.inTrial) router.replace(PLUS_TRIAL_STARTED);
    else router.replace(PLUS_MANAGE);
  }, [done, router]);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  return (
    <PlusSheet
      attitude={settings.attitude}
      said={lineWithNoTask(sheetLineSlot(from === 'one-more' ? 'one_more' : 'asked'), {
        language,
        attitude: settings.attitude,
      })}
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
