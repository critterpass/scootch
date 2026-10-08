import { useRouter } from 'expo-router';

import { useT } from '../../i18n/i18n-provider';
import { useDispatch, useToday } from '../../state/day-store-provider';
import { FittedSheet, SheetHeading } from '../../ui/fitted-sheet';
import { goBack } from '../../ui/motion/go-back';
import { Words } from '../table/words';

import { QuietHoursRows } from './quiet-hours';
import { Section } from './rows';

/**
 * The quiet hours, on a sheet as tall as its two times: when they start and when they end, each
 * moved by half an hour. Every step is written at once; closing the sheet keeps what is shown.
 */
export function QuietHoursSheetContainer() {
  const router = useRouter();
  const t = useT();
  const { settings } = useToday();
  const dispatch = useDispatch();
  return (
    <FittedSheet
      testID="quiet-hours"
      close={{
        label: t('settings.close'),
        hint: t('settings.close.hint'),
        onPress: () => goBack(router, '/settings'),
        testID: 'quiet-hours-close',
      }}
    >
      <SheetHeading>
        <Words kind="title">{t('settings.quietHours')}</Words>
        <Words kind="quiet">{t('settings.quietHours.note')}</Words>
      </SheetHeading>
      <Section>
        <QuietHoursRows
          start={settings.quietHoursStart}
          end={settings.quietHoursEnd}
          onChange={(changes) =>
            void dispatch({ type: 'settings_changed', changes }).catch(() => undefined)
          }
        />
      </Section>
    </FittedSheet>
  );
}
