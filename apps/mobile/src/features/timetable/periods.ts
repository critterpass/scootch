import {
  boardOrder,
  isFaded,
  UNKNOWN_SIZE_MINUTES,
  type Moment,
  type Task,
} from '@phusclass/domain/board';

/** One event from the phone's calendar, read on the phone and never sent anywhere. */
export interface CalendarEvent {
  readonly id: string;
  readonly title: string;
  /** Minutes after midnight on the day shown, on the person's clock. */
  readonly start: number;
  readonly end: number;
  readonly allDay: boolean;
  /** Somewhere to get to: class ends early before it. */
  readonly location: string | null;
}

/**
 * The school subject an event is filed under, by what kind of thing it is. A joke, not a
 * category system: anything it does not recognise is an elective.
 */
export type Subject =
  | 'pe'
  | 'homeroom'
  | 'recess'
  | 'biology'
  | 'geography'
  | 'music'
  | 'literature'
  | 'maths'
  | 'elective';

/** Words in a title, in either language, that give its subject away. First match wins. */
const SUBJECT_WORDS: readonly (readonly [Subject, readonly string[]])[] = [
  [
    'recess',
    [
      'lunch',
      'breakfast',
      'dinner',
      'brunch',
      'coffee',
      'ăn trưa',
      'ăn sáng',
      'ăn tối',
      'cà phê',
      'cafe',
      'bữa',
    ],
  ],
  [
    'pe',
    [
      'run',
      'gym',
      'yoga',
      'swim',
      'workout',
      'football',
      'tennis',
      'pilates',
      'cycling',
      'hike',
      'chạy',
      'bơi',
      'tập',
      'đá bóng',
      'cầu lông',
      'thể dục',
    ],
  ],
  [
    'biology',
    [
      'doctor',
      'dentist',
      'clinic',
      'hospital',
      'therapy',
      'gp',
      'bác sĩ',
      'nha sĩ',
      'khám',
      'bệnh viện',
      'phòng khám',
    ],
  ],
  [
    'homeroom',
    [
      'meeting',
      'standup',
      'stand-up',
      'sync',
      'review',
      '1:1',
      'call',
      'interview',
      'họp',
      'giao ban',
      'phỏng vấn',
    ],
  ],
  [
    'geography',
    [
      'flight',
      'train',
      'bus',
      'drive',
      'trip',
      'airport',
      'chuyến bay',
      'sân bay',
      'tàu',
      'xe khách',
      'đi xa',
    ],
  ],
  [
    'music',
    ['birthday', 'party', 'concert', 'wedding', 'sinh nhật', 'tiệc', 'đám cưới', 'hòa nhạc'],
  ],
  [
    'literature',
    ['class', 'lecture', 'study', 'exam', 'seminar', 'workshop', 'học', 'thi', 'hội thảo'],
  ],
  [
    'maths',
    ['bank', 'tax', 'budget', 'invoice', 'accountant', 'ngân hàng', 'thuế', 'kế toán', 'hóa đơn'],
  ],
];

function hasWord(title: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`, 'u').test(title);
}

export function subjectOf(title: string): Subject {
  const lower = title.toLocaleLowerCase('vi');
  for (const [subject, words] of SUBJECT_WORDS) {
    if (words.some((word) => hasWord(lower, word))) return subject;
  }
  return 'elective';
}

/** The school day the dial draws, in hours on the person's clock. */
export const DAY_FROM_HOUR = 7;
export const DAY_TO_HOUR = 17;
/** The morning half ends and recess comes at noon. */
export const NOON = 12 * 60;
/** A gap shorter than this is a breather, not a free period. */
export const MIN_FREE_MINUTES = 30;
/** Before something with somewhere to get to, class ends this much earlier. */
export const GET_THERE_MINUTES = 30;

export type Half = 'morning' | 'afternoon';

/** One period of the day: a class from the calendar, or a free period (tiết trống). */
export type Period =
  | {
      readonly kind: 'class';
      readonly id: string;
      readonly half: Half;
      /** Tiết 1, Tiết 2...: counted from the start of each half. */
      readonly number: number;
      readonly start: number;
      readonly end: number;
      readonly title: string;
      readonly subject: Subject;
      /** When class ends so there is time to get there; `null` when nowhere to go. */
      readonly classEndsAt: number | null;
    }
  | {
      readonly kind: 'free';
      readonly id: string;
      readonly half: Half;
      readonly number: number;
      readonly start: number;
      readonly end: number;
    };

export interface SchoolDay {
  readonly morning: readonly Period[];
  readonly afternoon: readonly Period[];
  /** Every free period, in order. */
  readonly free: readonly Extract<Period, { kind: 'free' }>[];
}

const halfOf = (start: number): Half => (start < NOON ? 'morning' : 'afternoon');

/**
 * The day as a timetable: the calendar's timed events as classes, each filed under a subject,
 * and the gaps between them inside the school day as free periods. A free period never crosses
 * noon, where recess splits the day into halves, and one before an event with somewhere to get
 * to ends early so there is time to get there. All-day events are not classes.
 */
export function schoolDay(events: readonly CalendarEvent[]): SchoolDay {
  const dayFrom = DAY_FROM_HOUR * 60;
  const dayTo = DAY_TO_HOUR * 60;
  const timed = events
    .filter((event) => !event.allDay && event.end > event.start)
    .slice()
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const classes = timed.map((event) => ({
    kind: 'class' as const,
    id: event.id,
    start: event.start,
    end: event.end,
    title: event.title,
    subject: subjectOf(event.title),
    classEndsAt:
      event.location !== null && event.location.trim() !== ''
        ? Math.max(0, event.start - GET_THERE_MINUTES)
        : null,
  }));

  // The gaps: walk the day, with each class's busy time starting when class must end for it.
  const gaps: { start: number; end: number }[] = [];
  let cursor = dayFrom;
  for (const one of classes) {
    const busyFrom = one.classEndsAt ?? one.start;
    if (busyFrom > cursor) gaps.push({ start: cursor, end: Math.min(busyFrom, dayTo) });
    cursor = Math.max(cursor, one.end);
    if (cursor >= dayTo) break;
  }
  if (cursor < dayTo) gaps.push({ start: cursor, end: dayTo });

  const freeSpans = gaps
    .flatMap((gap) =>
      gap.start < NOON && gap.end > NOON
        ? [
            { start: gap.start, end: NOON },
            { start: NOON, end: gap.end },
          ]
        : [gap],
    )
    .filter((gap) => gap.end - gap.start >= MIN_FREE_MINUTES);

  const all = [
    ...classes,
    ...freeSpans.map((gap) => ({ kind: 'free' as const, id: `free-${gap.start}`, ...gap })),
  ].sort((a, b) => a.start - b.start || (a.kind === 'free' ? 1 : -1));

  const numbered = (half: Half): Period[] =>
    all
      .filter((one) => halfOf(one.start) === half)
      .map((one, index) => ({ ...one, half, number: index + 1 }));
  const morning = numbered('morning');
  const afternoon = numbered('afternoon');
  return {
    morning,
    afternoon,
    free: [...morning, ...afternoon].filter(
      (one): one is Extract<Period, { kind: 'free' }> => one.kind === 'free',
    ),
  };
}

/** A free period with his pick for it from the board, or none when nothing on it fits. */
export interface FreePick {
  readonly period: Extract<Period, { kind: 'free' }>;
  readonly task: Task | null;
}

/**
 * His pick for each free period still to come: in his board order (brief 3), the first task that
 * fits the period's minutes and has not been picked for an earlier one. Faded tasks and anything
 * flagged crisis are never picked; a free period already gone gets no card.
 */
export function freePicks(
  day: SchoolDay,
  tasks: readonly Task[],
  now: Moment,
  nowMinutes: number | null,
): FreePick[] {
  const taken = new Set<string>();
  return day.free
    .filter((period) => nowMinutes === null || period.end > nowMinutes)
    .map((period) => {
      const minutes = period.end - Math.max(period.start, nowMinutes ?? period.start);
      const pick = boardOrder(tasks, { now, freeMinutes: minutes }).find(
        ({ task }) =>
          !taken.has(task.id) &&
          task.care !== 'crisis' &&
          !isFaded(task, now) &&
          (task.order.minutes ?? UNKNOWN_SIZE_MINUTES) <= minutes,
      );
      if (pick !== undefined) taken.add(pick.task.id);
      return { period, task: pick?.task ?? null };
    });
}

/** Saturday or Sunday with no classes: the weekend state. */
export function isWeekend(weekday: number, day: SchoolDay): boolean {
  const restDay = weekday === 0 || weekday === 6;
  const hasClass = [...day.morning, ...day.afternoon].some((one) => one.kind === 'class');
  return restDay && !hasClass;
}

/** "08:30", from minutes after midnight. */
export function clockOf(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}
