import type { CardFinish, CardRarity } from '@scootch/domain';

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
  /** The finish a card is printed on, as its foot names it. */
  readonly finish: Record<CardFinish, string>;
  /** The round sticker on a story: one more on the shelf. */
  readonly shelf: string;
  /** The pill on a story: "took 4 minutes". */
  readonly took: (duration: string) => string;
  /** The rows of facts on a trading card. */
  readonly caught: string;
  readonly fight: string;
  /** The words on the sticker sheet. */
  readonly stickerSheet: string;
  readonly stickers: readonly [string, string];
  readonly member: (number: string) => string;
  /** The day's receipt. */
  readonly doneLog: string;
  readonly thingsDone: string;
  readonly monstersCaught: string;
  readonly timeSpent: string;
  readonly changeDue: readonly [string, string];
  readonly stamped: string;
  readonly thanks: readonly [string, string];
  /** The month's poster. */
  readonly months: readonly string[];
  readonly wrapped: (month: string) => string;
  readonly caughtThisMonth: (count: number) => string;
  readonly mostCaught: (kind: string, times: number) => string;
  readonly bestDay: (weekday: string) => string;
  readonly longWeekdays: readonly [string, string, string, string, string, string, string];
}

const EN_MONTHS = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ');
const plural = (count: number, one: string, many: string): string =>
  `${count} ${count === 1 ? one : many}`;

export const CARD_LABELS: Record<CardLanguage, CardLabels> = {
  en: {
    rarity: { common: 'Common', uncommon: 'Rare', rare: 'Epic' },
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
    storyHeadline: 'Did the thing.',
    finish: {
      paper: 'Paper',
      holo: 'Holo foil',
      chrome: 'Chrome',
      jelly: 'Jelly',
      glass: 'Frosted glass',
      flock: 'Velvet',
      riso: 'Riso',
    },
    shelf: 'SHELF',
    took: (duration) => `took ${duration}`,
    caught: 'Caught',
    fight: 'Fight',
    stickerSheet: 'STICKER SHEET',
    stickers: ['DONE IS A VIBE', 'tiny wins only'],
    member: (number) => `MEMBER ${number}`,
    doneLog: 'DONE LOG',
    thingsDone: 'THINGS DONE',
    monstersCaught: 'MONSTERS CAUGHT',
    timeSpent: 'TIME SPENT',
    changeDue: ['CHANGE DUE:', 'one calmer brain'],
    stamped: 'STAMPED',
    thanks: ['THANK YOU FOR SHOPPING', 'AT YOUR OWN LIFE'],
    months:
      'January February March April May June July August September October November December'.split(
        ' ',
      ),
    wrapped: (month) => `${month.toUpperCase()}, WRAPPED`,
    caughtThisMonth: (count) => (count === 1 ? 'monster caught.' : 'monsters caught.'),
    mostCaught: (kind, times) => `Most caught: ${kind}, ${plural(times, 'time', 'times')}.`,
    bestDay: (weekday) => `Best day: a ${weekday}, obviously.`,
    longWeekdays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  },
  vi: {
    rarity: { common: 'Thường', uncommon: 'Hiếm', rare: 'Sử thi' },
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
    storyHeadline: 'Làm xong việc đó rồi.',
    finish: {
      paper: 'Giấy',
      holo: 'Ánh bảy màu',
      chrome: 'Crôm',
      jelly: 'Thạch',
      glass: 'Kính mờ',
      flock: 'Nhung',
      riso: 'In riso',
    },
    shelf: 'LÊN KỆ',
    took: (duration) => `mất ${duration}`,
    caught: 'Bắt lúc',
    fight: 'Vật lộn',
    stickerSheet: 'TỜ NHÃN DÁN',
    stickers: ['XONG LÀ VUI', 'thắng nhỏ thôi'],
    member: (number) => `THÀNH VIÊN ${number}`,
    doneLog: 'SỔ VIỆC XONG',
    thingsDone: 'VIỆC ĐÃ XONG',
    monstersCaught: 'QUÁI ĐÃ BẮT',
    timeSpent: 'THỜI GIAN',
    changeDue: ['TIỀN THỐI:', 'một cái đầu nhẹ hơn'],
    stamped: 'ĐÃ ĐÓNG DẤU',
    thanks: ['CẢM ƠN BẠN ĐÃ MUA SẮM', 'Ở CHÍNH ĐỜI MÌNH'],
    months: Array.from({ length: 12 }, (_, index) => `Tháng ${index + 1}`),
    wrapped: (month) => `${month.toUpperCase()}, NHÌN LẠI`,
    caughtThisMonth: () => 'con quái đã bắt.',
    mostCaught: (kind, times) => `Bắt nhiều nhất: ${kind}, ${times} lần.`,
    bestDay: (weekday) => `Ngày đỉnh nhất: ${weekday}, khỏi nói.`,
    longWeekdays: ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'],
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
