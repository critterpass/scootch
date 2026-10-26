// The logbook as the registry captures it: fixed finished tasks in the variant's language, drawn
// by the same page the route draws, with nothing read from the phone's own board.
import type { LogbookEntry } from '@phusclass/domain/board';
import type { Language } from '@phusclass/i18n';

import { useHandFont } from '../../classroom/use-hand-font';
import { useLanguage, useT } from '../../i18n/i18n-provider';

import { LogbookPage } from './logbook-page';
import { logbookRows } from './logbook-rows';

const TODAY = '2026-10-26';

const ENTRIES: readonly Omit<LogbookEntry, 'text'>[] = [
  { taskId: 'a', at: 5, day: '2026-10-26', periodMinutes: 9, comment: 'good', giayKhen: false },
  { taskId: 'b', at: 4, day: '2026-10-26', periodMinutes: 20, comment: 'fine', giayKhen: false },
  {
    taskId: 'c',
    at: 3,
    day: '2026-10-25',
    periodMinutes: 6,
    comment: 'good work',
    giayKhen: false,
  },
  { taskId: 'd', at: 2, day: '2026-10-24', periodMinutes: null, comment: null, giayKhen: false },
  { taskId: 'e', at: 1, day: '2026-10-12', periodMinutes: 22, comment: 'ten', giayKhen: true },
];

const DONE: Readonly<Record<Language, readonly string[]>> = {
  en: [
    'Email the landlord',
    'Email the dentist',
    'Pay the electricity bill',
    'Call Mum back',
    'Tax receipts, filed',
  ],
  vi: ['Email chủ nhà', 'Email nha sĩ', 'Trả tiền điện', 'Gọi lại cho mẹ', 'Nộp hóa đơn thuế'],
};

function LogbookFixture({ empty }: { readonly empty: boolean }) {
  const { language } = useLanguage();
  const t = useT();
  const hand = useHandFont();
  const entries = empty
    ? []
    : ENTRIES.map((entry, index) => ({ ...entry, text: DONE[language][index] ?? '' }));
  const rows = logbookRows(entries, TODAY, language, {
    minutes: (minutes) => t('logbook.minutes', { minutes }),
    ticked: t('logbook.ticked'),
    certificate: t('logbook.certificate'),
  });
  return <LogbookPage rows={rows} week={44} hand={hand} handle={null} />;
}

export const LogbookFull = () => <LogbookFixture empty={false} />;
export const LogbookEmpty = () => <LogbookFixture empty />;
