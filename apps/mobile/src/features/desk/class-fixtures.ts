import {
  DAY_MS,
  MINUTE_MS,
  momentAt,
  newTask,
  type Happening,
  type IsoDate,
  type Task,
} from '@phusclass/domain/board';
import type { Language } from '@phusclass/i18n';

import {
  standardVariants,
  type Condition,
  type ScreenVariant,
} from '../../screens/registry/support/screen-state';
import {
  viewOf,
  type BoardSnapshot,
  type BoardState,
  type OpenSession,
} from '../../state/board-view';

/**
 * Boards for the registry's captures, built with the real rules: a fixed Monday morning and the
 * App board's tasks, in the user's own words in each language. Nothing here is used by the app.
 */
export const FIXTURE_NOW = Date.parse('2026-10-26T09:00:00Z');

export const FIXTURE_WORDS: Record<Language, readonly string[]> = {
  en: [
    'Email the dentist to move Thursday',
    'Email the landlord about the sink',
    'Renew passport',
    'Tax receipts',
    'Reply to Minh',
    'Cancel the gym trial',
    'Fix the bike light',
    'Read chapter 4',
    'Book the car service',
  ],
  vi: [
    'Gửi email cho nha sĩ dời lịch thứ Năm',
    'Gửi email cho chủ nhà về bồn rửa',
    'Gia hạn hộ chiếu',
    'Biên lai thuế',
    'Trả lời Minh',
    'Hủy gói tập thử ở phòng gym',
    'Sửa đèn xe đạp',
    'Đọc chương 4',
    'Đặt lịch bảo dưỡng xe',
  ],
};

/** Each task's short name, as the App board chalks it. */
const SHORT: Record<Language, readonly string[]> = {
  en: [
    'Dentist email',
    'Landlord email',
    'Renew passport',
    'Tax receipts',
    'Reply to Minh',
    'Cancel the gym trial',
    'Fix the bike light',
    'Read chapter 4',
    'Book car service',
  ],
  vi: [
    'Email nha sĩ',
    'Email chủ nhà',
    'Gia hạn hộ chiếu',
    'Biên lai thuế',
    'Trả lời Minh',
    'Hủy gói tập thử',
    'Sửa đèn xe đạp',
    'Đọc chương 4',
    'Bảo dưỡng xe',
  ],
};

/**
 * What the App and Duo boards chalk in the other rows' corners: Landlord email's two tallies,
 * Renew passport's 14 Nov, Tax receipts' four, Reply to Minh's Friday and the gym trial's
 * Wednesday. They are the tasks' own late slips and due days, so the board's rules order them.
 */
const MARKS: Readonly<Record<number, { readonly slips?: number; readonly due?: IsoDate }>> = {
  1: { slips: 2 },
  2: { due: '2026-11-14' },
  3: { slips: 4 },
  4: { due: '2026-10-30' },
  5: { due: '2026-10-28' },
};

/** Every capture of a classroom state: daylight only, both languages, both text sizes. */
export function classVariants(conditions: readonly Condition[] = []): ScreenVariant[] {
  return standardVariants(conditions).filter((variant) => variant.appearance === 'light');
}

export interface FixtureOptions {
  readonly language: Language;
  /** Minutes the desk task has waited on the desk; its pressure follows. */
  readonly waited?: number;
  /** Seconds of the fuse already burnt. */
  readonly burnt?: number;
  readonly slips?: number;
  readonly heavy?: boolean;
  readonly empty?: boolean;
  /** The desk task has an old twin, untouched for three weeks: "Still yours?". */
  readonly fading?: boolean;
  /** Seconds into a running period. */
  readonly running?: number;
  readonly happening?: Happening | null;
  readonly recessSeconds?: number;
}

function slipsOf(count: number, at: number): Task['slips'] {
  return Array.from({ length: count }, (_, i) => ({
    reason: 'Too tired',
    accepted: false,
    at: at - (count - i) * DAY_MS,
  }));
}

/** The store's snapshot of a board set up as asked. */
export function fixtureSnapshot(options: FixtureOptions): BoardSnapshot {
  const now = FIXTURE_NOW;
  const words = FIXTURE_WORDS[options.language];
  const short = SHORT[options.language];
  const waited = (options.waited ?? 3) * MINUTE_MS;
  const tasks: Task[] = options.empty
    ? []
    : words.map((text, i) => {
        const task = newTask({
          id: `task-${i}`,
          text: options.heavy && i === 0 ? heavyWords[options.language] : text,
          short: options.heavy && i === 0 ? heavyShort[options.language] : short[i],
          at: now - (9 - i) * DAY_MS,
          care: options.heavy && i === 0 ? 'serious' : 'none',
          screened: true,
          dueDate: MARKS[i]?.due ?? null,
        });
        if (i !== 0) return { ...task, slips: slipsOf(MARKS[i]?.slips ?? 0, now) };
        const since = now - waited;
        return {
          ...task,
          status: 'desk',
          slips: slipsOf(options.slips ?? 0, now),
          lastTouched: since,
          desk: {
            since,
            opened: now - (options.burnt ?? 30) * 1000,
            startedAt: options.running === undefined ? null : now - options.running * 1000,
            insideFuse: options.running === undefined ? null : true,
          },
        };
      });
  if (options.fading) {
    tasks.push({
      ...newTask({
        id: 'task-old',
        text: words[7] ?? '',
        short: short[7],
        at: now - 21 * DAY_MS,
        screened: true,
      }),
      lastTouched: now - 21 * DAY_MS,
    });
  }
  const session: OpenSession | null =
    options.running === undefined
      ? null
      : {
          id: 'session-1',
          taskId: 'task-0',
          startedAt: now - options.running * 1000,
          minutes: options.happening === 'pop quiz' ? 15 : 10,
          happening: options.happening ?? null,
        };
  const state: BoardState = {
    ready: true,
    tasks,
    carvings: [],
    session,
    deskReason: null,
    lastFinish: null,
    lastSlip: null,
    recess:
      options.recessSeconds === undefined
        ? null
        : { startedAt: now - options.recessSeconds * 1000 },
    recessOffered: false,
    finishes: 1,
    longBoardRemarkedOn: null,
    tuitionPinnedAt: null,
    enrolled: false,
    crisisOpenOn: null,
    crisisShownOn: null,
    birthday: '01-01',
    celsius: null,
    periodLength: 10,
    drum: true,
  };
  const snapshot = viewOf(state, momentAt(now, 'UTC', 4));
  if (options.happening === undefined || snapshot.desk === null) return snapshot;
  return { ...snapshot, desk: { ...snapshot.desk, happening: options.happening } };
}

const heavyWords: Record<Language, string> = {
  en: 'Call the hospital about Dad’s results',
  vi: 'Gọi bệnh viện hỏi kết quả của bố',
};

const heavyShort: Record<Language, string> = {
  en: 'Call the hospital',
  vi: 'Gọi bệnh viện',
};

/** The ramble the Listening board hears, in each language. */
export const HEARD: Record<Language, string> = {
  en: 'Okay so I need to call the bank about the card thing and get a birthday gift for Linh before Saturday',
  vi: 'À mình cần gọi ngân hàng về cái thẻ, rồi mua quà sinh nhật cho Linh trước thứ Bảy',
};

/** What the Typing board has typed. */
export const TYPED: Record<Language, string> = {
  en: 'Call the landlord about the sink before Thurs',
  vi: 'Gọi chủ nhà về bồn rửa trước thứ Năm',
};

/** The roll-call name the boards shout. */
export const FIXTURE_NAME = 'Trần Minh Anh';
