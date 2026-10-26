import { DAY_MS, type IsoDate, type Task } from '@phusclass/domain/board';

/**
 * A school term. The school year starts with khai giảng in September: the first term runs from
 * August to January, the second from February to July.
 */
export interface Term {
  readonly number: 1 | 2;
  /** The school year, "2026–27". */
  readonly years: string;
  /** The first day of the term. */
  readonly from: IsoDate;
  /** The first day after it. */
  readonly until: IsoDate;
}

const pad = (value: number) => String(value).padStart(2, '0');

export function termOf(day: IsoDate): Term {
  const year = Number(day.slice(0, 4));
  const month = Number(day.slice(5, 7));
  const startYear = month >= 8 ? year : year - 1;
  const years = `${startYear}–${pad((startYear + 1) % 100)}`;
  if (month >= 8 || month === 1) {
    return { number: 1, years, from: `${startYear}-08-01`, until: `${startYear + 1}-02-01` };
  }
  return { number: 2, years, from: `${startYear + 1}-02-01`, until: `${startYear + 1}-08-01` };
}

/** Both terms of the school year a day falls in. */
export function termsOfYear(day: IsoDate): readonly [Term, Term] {
  const term = termOf(day);
  // The second term starts in February; its year's first term began the August before.
  const first = term.number === 1 ? term : termOf(`${Number(term.from.slice(0, 4)) - 1}-09-01`);
  return [first, termOf(first.until)];
}

/** What a finished task is filed under on the report: a joke subject, like the timetable's. */
export type ReportSubject =
  'paperwork' | 'home' | 'calls' | 'health' | 'errands' | 'study' | 'work' | 'other';

const SUBJECT_WORDS: readonly (readonly [ReportSubject, readonly string[]])[] = [
  [
    'calls',
    ['call', 'email', 'reply', 'text', 'message', 'ring', 'gọi', 'nhắn', 'trả lời', 'email'],
  ],
  [
    'health',
    [
      'dentist',
      'doctor',
      'gym',
      'run',
      'pills',
      'medicine',
      'clinic',
      'nha sĩ',
      'bác sĩ',
      'khám',
      'thuốc',
      'tập',
      'chạy',
    ],
  ],
  [
    'paperwork',
    [
      'tax',
      'form',
      'passport',
      'receipt',
      'insurance',
      'visa',
      'bill',
      'renew',
      'thuế',
      'giấy',
      'hộ chiếu',
      'biên lai',
      'bảo hiểm',
      'hoá đơn',
      'hóa đơn',
      'gia hạn',
    ],
  ],
  [
    'home',
    [
      'clean',
      'sink',
      'fix',
      'laundry',
      'dishes',
      'tidy',
      'repair',
      'light',
      'dọn',
      'sửa',
      'giặt',
      'bồn',
      'rửa bát',
      'đèn',
    ],
  ],
  [
    'errands',
    [
      'buy',
      'shop',
      'post',
      'pick up',
      'return',
      'book',
      'cancel',
      'mua',
      'gửi',
      'lấy',
      'đặt',
      'hủy',
      'huỷ',
    ],
  ],
  [
    'study',
    ['read', 'study', 'chapter', 'essay', 'homework', 'learn', 'đọc', 'học', 'chương', 'bài'],
  ],
  [
    'work',
    [
      'report',
      'deck',
      'slides',
      'review',
      'meeting',
      'client',
      'deploy',
      'báo cáo',
      'khách',
      'họp',
    ],
  ],
];

function hasWord(text: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`, 'u').test(text);
}

export function reportSubjectOf(text: string): ReportSubject {
  const lower = text.toLocaleLowerCase('vi');
  for (const [subject, words] of SUBJECT_WORDS) {
    if (words.some((word) => hasWord(lower, word))) return subject;
  }
  return 'other';
}

export interface ReportLine {
  readonly subject: ReportSubject;
  /** A few of the term's finished tasks under it, newest first, in the user's own words. */
  readonly examples: readonly string[];
}

export interface ReportCard {
  readonly term: Term;
  /** Nothing finished in the term yet: he has nothing to write. */
  readonly empty: boolean;
  readonly lines: readonly ReportLine[];
  /** The one that waited longest before it was done in a period. */
  readonly hardest: {
    readonly text: string;
    readonly waitedDays: number;
    readonly tookMinutes: number;
  } | null;
}

/** How many tasks a subject line names, at most. */
const EXAMPLES = 2;

/**
 * The logbook printed as a school report for one term: finished tasks under subjects, the hardest
 * one, and room for his comment. No counts, totals or averages, and nothing heavy: a serious or
 * crisis task never appears on a report that can be shared.
 */
export function reportCard(tasks: readonly Task[], term: Term): ReportCard {
  const done = tasks
    .filter(
      (task) =>
        task.status === 'done' &&
        task.done !== null &&
        task.care === 'none' &&
        task.done.day >= term.from &&
        task.done.day < term.until,
    )
    .sort((a, b) => (b.done?.at ?? 0) - (a.done?.at ?? 0));
  const bySubject = new Map<ReportSubject, string[]>();
  for (const task of done) {
    const subject = reportSubjectOf(task.text);
    const list = bySubject.get(subject) ?? [];
    if (list.length < EXAMPLES) list.push(task.text);
    bySubject.set(subject, list);
  }
  const order: readonly ReportSubject[] = [
    'paperwork',
    'home',
    'calls',
    'health',
    'errands',
    'study',
    'work',
    'other',
  ];
  let hardest: ReportCard['hardest'] = null;
  for (const task of done) {
    const took = task.done?.periodMinutes ?? null;
    if (took === null || task.done === null) continue;
    const waited = Math.max(0, Math.floor((task.done.at - task.createdAt) / DAY_MS));
    if (hardest === null || waited > hardest.waitedDays) {
      hardest = { text: task.text, waitedDays: waited, tookMinutes: took };
    }
  }
  return {
    term,
    empty: done.length === 0,
    lines: order
      .filter((subject) => bySubject.has(subject))
      .map((subject) => ({ subject, examples: bySubject.get(subject) ?? [] })),
    hardest,
  };
}
