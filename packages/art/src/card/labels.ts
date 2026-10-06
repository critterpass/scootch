import type { CardRarity } from '@scootch/domain';

export type CardLanguage = 'en' | 'vi';

/** The fixed words printed on a card and on a share story. Everything else is the user's data. */
export interface CardLabels {
  readonly rarity: Record<CardRarity, string>;
  readonly number: (digits: string) => string;
  readonly lurked: string;
  readonly dread: string;
  readonly caughtIn: string;
  readonly days: (count: number) => string;
  /** The short form on the card: "9 min", "1 h 5 min". */
  readonly duration: (hours: number, minutes: number) => string;
  /** The long form in a story sentence: "9 minutes". */
  readonly durationLong: (hours: number, minutes: number) => string;
  readonly caughtBy: (date: string) => string;
  readonly notCaughtYet: string;
  readonly stamp: string;
  readonly weekdays: readonly [string, string, string, string, string, string, string];
  readonly date: (weekday: string, day: number, month: number) => string;
  readonly storyTook: (duration: string) => string;
  readonly storyWaited: (days: string) => string;
  /** The story headline when the task is hidden or none was written. */
  readonly storyHeadline: string;
}

const EN_MONTHS = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ');
const plural = (count: number, one: string, many: string): string =>
  `${count} ${count === 1 ? one : many}`;

export const CARD_LABELS: Record<CardLanguage, CardLabels> = {
  en: {
    rarity: { common: 'Common', uncommon: 'Uncommon', rare: 'Rare' },
    number: (digits) => `No. ${digits}`,
    lurked: 'Lurked',
    dread: 'Dread',
    caughtIn: 'Caught in',
    days: (count) => plural(count, 'day', 'days'),
    duration: (h, m) => (h === 0 ? `${m} min` : m === 0 ? `${h} h` : `${h} h ${m} min`),
    durationLong: (h, m) =>
      [
        h > 0 ? plural(h, 'hour', 'hours') : '',
        m > 0 || h === 0 ? plural(m, 'minute', 'minutes') : '',
      ]
        .filter((part) => part !== '')
        .join(' '),
    caughtBy: (date) => `Caught by you · ${date}`,
    notCaughtYet: 'Not caught yet',
    stamp: 'CAUGHT',
    weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    date: (weekday, day, month) => `${weekday} ${day} ${EN_MONTHS[month - 1] ?? ''}`,
    storyTook: (duration) => `It took ${duration}.`,
    storyWaited: (days) => `It had been ${days}.`,
    storyHeadline: 'I finally did the thing.',
  },
  vi: {
    rarity: { common: 'Thường', uncommon: 'Ít gặp', rare: 'Hiếm' },
    number: (digits) => `Số ${digits}`,
    lurked: 'Ẩn nấp',
    dread: 'Độ ngán',
    caughtIn: 'Bắt trong',
    days: (count) => `${count} ngày`,
    duration: (h, m) => (h === 0 ? `${m} phút` : m === 0 ? `${h} giờ` : `${h} giờ ${m} phút`),
    durationLong: (h, m) =>
      h === 0 ? `${m} phút` : m === 0 ? `${h} tiếng` : `${h} tiếng ${m} phút`,
    caughtBy: (date) => `Bạn bắt được · ${date}`,
    notCaughtYet: 'Chưa bắt được',
    stamp: 'ĐÃ BẮT',
    weekdays: ['CN', 'Th 2', 'Th 3', 'Th 4', 'Th 5', 'Th 6', 'Th 7'],
    date: (weekday, day, month) => `${weekday}, ${day} thg ${month}`,
    storyTook: (duration) => `Chỉ mất ${duration}.`,
    storyWaited: (days) => `Mà để tận ${days}.`,
    storyHeadline: 'Cuối cùng mình cũng làm xong.',
  },
};

/** "Tue 6 Oct" from a `YYYY-MM-DD` day, with no locale data and no time zone involved. */
export function formatCardDate(isoDate: string, language: CardLanguage): string {
  const [year = 1970, month = 1, day = 1] = isoDate.split('-').map(Number);
  const labels = CARD_LABELS[language];
  const weekday = labels.weekdays[new Date(Date.UTC(year, month - 1, day)).getUTCDay()] ?? '';
  return labels.date(weekday, day, month);
}

/** Splits whole minutes into hours and minutes. */
export function splitMinutes(total: number): [hours: number, minutes: number] {
  return [Math.floor(total / 60), total % 60];
}
