import { daysBetween, type IsoDate } from './moment';

/**
 * The classroom's day, from the real calendar (brief 5). Everything here is a function of the
 * date and, optionally, the temperature outside; nothing is announced, earned or sold.
 */

/**
 * Mùng 1 Tết (the lunar new year) by the Vietnamese calendar, which is reckoned at UTC+7. It
 * agrees with the Chinese calendar in every one of these years.
 */
export const TET: Readonly<Record<number, IsoDate>> = {
  2026: '2026-02-17',
  2027: '2027-02-06',
  2028: '2028-01-26',
  2029: '2029-02-13',
  2030: '2030-02-03',
  2031: '2031-01-23',
  2032: '2032-02-11',
  2033: '2033-01-31',
  2034: '2034-02-19',
  2035: '2035-02-08',
};

/** Rằm tháng Tám, the fifteenth of the eighth lunar month. */
export const TRUNG_THU: Readonly<Record<number, IsoDate>> = {
  2026: '2026-09-25',
  2027: '2027-09-15',
  2028: '2028-10-03',
  2029: '2029-09-22',
  2030: '2030-09-12',
  2031: '2031-10-01',
  2032: '2032-09-19',
  2033: '2033-09-08',
  2034: '2034-09-27',
  2035: '2035-09-16',
};

/** Tết is in the room from about 23 tháng Chạp (Ông Công Ông Táo) to mùng 7, when the nêu comes down. */
export const TET_FROM_DAYS_BEFORE = 7;
export const TET_UNTIL_DAYS_AFTER = 6;
/** Lanterns go up the week before Trung thu and come down after the night itself. */
export const TRUNG_THU_FROM_DAYS_BEFORE = 7;

/** Exam season, when the phượng blooms red: May and June. */
export const EXAM_MONTHS: readonly number[] = [5, 6];
/** The monsoon on the window: May to October, the rainy season across most of Vietnam. */
export const MONSOON_MONTHS: readonly number[] = [5, 6, 7, 8, 9, 10];
/** Without a temperature, the hottest and coldest months of the north are taken. */
export const HOT_MONTHS: readonly number[] = [5, 6, 7];
export const COLD_MONTHS: readonly number[] = [12, 1];
/** With a temperature, iced coffee from this many degrees and the cardigan at or below that. */
export const HOT_FROM_CELSIUS = 32;
export const COLD_TO_CELSIUS = 15;

export type SpecialDay = 'teachers day' | 'khai giang' | 'tet' | 'trung thu' | 'his birthday';

export type ClassDay = {
  /** One special day at most; Tết wins when two meet. */
  readonly special: SpecialDay | null;
  /** Days from mùng 1 Tết while Tết is in the room (negative before it), else `null`. */
  readonly tetDay: number | null;
  readonly examSeason: boolean;
  readonly monsoon: boolean;
  readonly heat: 'hot' | 'cold' | null;
};

export type ClassDayOptions = {
  /** Outside temperature now, when the phone knows it. */
  readonly celsius?: number | null;
  /** His birthday as `MM-DD`, fixed once per install and never shown. */
  readonly birthday?: string | null;
};

function monthOf(day: IsoDate): number {
  return Number(day.slice(5, 7));
}

function yearOf(day: IsoDate): number {
  return Number(day.slice(0, 4));
}

/** Days from mùng 1 Tết when `day` falls in Tết, else `null`. Years outside the table have none. */
export function tetDayOf(day: IsoDate): number | null {
  const year = yearOf(day);
  for (const tet of [TET[year], TET[year + 1]]) {
    if (tet === undefined) continue;
    const offset = daysBetween(tet, day);
    if (offset >= -TET_FROM_DAYS_BEFORE && offset <= TET_UNTIL_DAYS_AFTER) return offset;
  }
  return null;
}

export function isTrungThu(day: IsoDate): boolean {
  const night = TRUNG_THU[yearOf(day)];
  if (night === undefined) return false;
  const offset = daysBetween(night, day);
  return offset >= -TRUNG_THU_FROM_DAYS_BEFORE && offset <= 0;
}

export function classDay(day: IsoDate, options: ClassDayOptions = {}): ClassDay {
  const month = monthOf(day);
  const monthDay = day.slice(5);
  const tetDay = tetDayOf(day);
  const special: SpecialDay | null =
    tetDay !== null
      ? 'tet'
      : monthDay === '11-20'
        ? 'teachers day'
        : monthDay === '09-05'
          ? 'khai giang'
          : isTrungThu(day)
            ? 'trung thu'
            : options.birthday != null && monthDay === options.birthday
              ? 'his birthday'
              : null;
  const celsius = options.celsius ?? null;
  const heat =
    celsius !== null
      ? celsius >= HOT_FROM_CELSIUS
        ? 'hot'
        : celsius <= COLD_TO_CELSIUS
          ? 'cold'
          : null
      : HOT_MONTHS.includes(month)
        ? 'hot'
        : COLD_MONTHS.includes(month)
          ? 'cold'
          : null;
  return {
    special,
    tetDay,
    examSeason: EXAM_MONTHS.includes(month),
    monsoon: MONSOON_MONTHS.includes(month),
    heat,
  };
}
