import { DAY_MS, momentAt, newTask, type Task } from '@phusclass/domain/board';
import { useMemo } from 'react';

import { useLanguage } from '../../i18n/i18n-provider';
import { FIXTURE_NAME, FIXTURE_NOW } from '../desk/class-fixtures';
import { fixedLine, lineFor } from '../desk/his-line';

import { ReportCardView } from './report-card-view';
import { reportCard, termsOfYear } from './report-model';

/** Finished tasks of the first term, in each language. Nothing here is used by the app. */
const DONE: Readonly<Record<'en' | 'vi', readonly (readonly [string, number])[]>> = {
  en: [
    ['Tax receipts', 3],
    ['Renew passport', 12],
    ['Fix the bike light', 5],
    ['Clean the sink', 2],
    ['Call Mum', 1],
    ['Email the landlord about the sink', 4],
    ['Email the dentist', 9],
  ],
  vi: [
    ['Biên lai thuế', 3],
    ['Gia hạn hộ chiếu', 12],
    ['Sửa đèn xe đạp', 5],
    ['Dọn bồn rửa', 2],
    ['Gọi cho mẹ', 1],
    ['Nhắn chủ nhà về bồn rửa', 4],
    ['Khám nha sĩ', 9],
  ],
};

function finishedTasks(language: 'en' | 'vi'): Task[] {
  return DONE[language].map(([text, waited], index) => {
    const at = FIXTURE_NOW - (index + 1) * 2 * DAY_MS;
    const day = momentAt(at, 'Asia/Ho_Chi_Minh').day;
    return {
      ...newTask({ id: `done-${index}`, text, at: at - waited * DAY_MS }),
      status: 'done',
      done: { at, day, periodMinutes: 11, comment: 'good', carving: null, giayKhen: false },
    };
  });
}

const noop = () => undefined;

export function ReportCardFixture({
  which,
}: {
  readonly which: 'term' | 'hidden' | 'later' | 'locked';
}) {
  const { language } = useLanguage();
  const today = momentAt(FIXTURE_NOW, 'Asia/Ho_Chi_Minh').day;
  const terms = termsOfYear(today);
  const term = which === 'later' ? terms[1] : terms[0];
  const card = useMemo(() => reportCard(finishedTasks(language), term), [language, term]);
  return (
    <ReportCardView
      terms={terms}
      card={card}
      later={which === 'later'}
      name={FIXTURE_NAME}
      comment={lineFor(language, 'reportCardComment', 'fixture')?.text ?? null}
      conduct={fixedLine(language, 'commentGood')}
      locked={which === 'locked'}
      hidden={which === 'hidden'}
      onTerm={noop}
      onHide={noop}
      onShare={noop}
      onBack={noop}
    />
  );
}
