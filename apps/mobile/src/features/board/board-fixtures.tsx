// The board as the registry captures them: fixed tasks in the variant's language,
// drawn by the same pages the routes draw, with nothing read from the phone's own board.
import type { Language } from '@phusclass/i18n';
import { createChooser, type Moment } from '@phusclass/voice/class';

import { useHandFont } from '../../classroom/use-hand-font';
import { useLanguage, useT } from '../../i18n/i18n-provider';

import { BoardPage, LedgeHandle } from './board-page';
import { boardDateLine, dueLabel, type BoardRow, type RowMark } from './board-rows';

const TODAY = '2026-10-26';

const TASKS: Readonly<Record<Language, readonly string[]>> = {
  en: [
    'Dentist email',
    'Landlord email',
    'Renew passport',
    'Tax receipts',
    'Reply to Minh',
    'Cancel the gym trial',
    'Fix the bike light',
    'Read chapter 4',
  ],
  vi: [
    'Email nha sĩ',
    'Email chủ nhà',
    'Gia hạn hộ chiếu',
    'Hóa đơn thuế',
    'Trả lời Minh',
    'Hủy gói tập thử',
    'Sửa đèn xe đạp',
    'Đọc chương 4',
  ],
};

const LONG: Readonly<Record<Language, string>> = {
  en: 'Write to the council about the broken streetlight on the corner before the end of the month',
  vi: 'Viết thư cho phường về cây đèn đường hỏng ở góc phố trước cuối tháng này',
};

function line(language: Language, moment: Moment, seed: string, task?: string): string {
  return createChooser(language).say(moment, seed, task === undefined ? {} : { task })?.text ?? '';
}

function rowsFor(language: Language, today: string, longText: boolean): BoardRow[] {
  const words = TASKS[language];
  const date = (day: string): RowMark => ({
    kind: 'date',
    label: dueLabel(day, TODAY, language, { today }),
  });
  const marks: RowMark[] = [
    { kind: 'tally', count: 3, frontRow: false },
    { kind: 'tally', count: 2, frontRow: false },
    date('2026-11-14'),
    { kind: 'tally', count: 5, frontRow: true },
    date('2026-10-30'),
    date('2026-10-28'),
    { kind: 'none' },
    { kind: 'none' },
  ];
  return words.map((text, index) => ({
    id: `fixture-${index}`,
    text: longText && index === 1 ? LONG[language] : text,
    onDesk: index === 0,
    today: index === 0,
    mark: marks[index] ?? { kind: 'none' },
    faded: index === words.length - 1,
    heavy: false,
    screened: true,
  }));
}

type Fixture = 'full' | 'empty' | 'swapped' | 'menu' | 'reword' | 'long-text' | 'plain';

/** Plain company after a crisis: no tally, no front row, no old chalk asking to be kept. */
function plainRows(rows: readonly BoardRow[]): BoardRow[] {
  return rows.map((row) => ({
    ...row,
    faded: false,
    mark: row.mark.kind === 'tally' ? { kind: 'none' } : row.mark,
  }));
}

function BoardFixture({ fixture }: { readonly fixture: Fixture }) {
  const { language } = useLanguage();
  const t = useT();
  const hand = useHandFont();
  const written =
    fixture === 'empty' ? [] : rowsFor(language, t('board.today'), fixture === 'long-text');
  const rows = fixture === 'plain' ? plainRows(written) : written;
  const old = rows.find((row) => row.faded);
  const remark =
    fixture === 'plain'
      ? line(language, 'crisisCompany', TODAY)
      : fixture === 'empty'
        ? line(language, 'emptyDesk', TODAY)
        : fixture === 'swapped'
          ? line(language, 'swapAllowed', 'fixture', rows[1]?.text)
          : line(language, 'boardLong', TODAY);
  return (
    <BoardPage
      rows={rows}
      dateLine={boardDateLine(TODAY, language)}
      remark={remark}
      stillYours={
        old === undefined ? {} : { [old.id]: line(language, 'boardStillYours', 'fixture-old') }
      }
      mood={fixture === 'plain' ? 'calm' : 'over'}
      hand={hand}
      onAction={() => undefined}
      onReword={() => undefined}
      onLogbook={() => undefined}
      onTimetable={() => undefined}
      ledge={<LedgeHandle />}
      {...(fixture === 'menu' ? { menuOpen: { id: 'fixture-1' } } : {})}
      {...(fixture === 'reword' ? { menuOpen: { id: 'fixture-1', rewording: true } } : {})}
    />
  );
}

export const BoardFull = () => <BoardFixture fixture="full" />;
export const BoardEmpty = () => <BoardFixture fixture="empty" />;
export const BoardSwapped = () => <BoardFixture fixture="swapped" />;
export const BoardMenu = () => <BoardFixture fixture="menu" />;
export const BoardReword = () => <BoardFixture fixture="reword" />;
export const BoardLongText = () => <BoardFixture fixture="long-text" />;
export const BoardPlain = () => <BoardFixture fixture="plain" />;
