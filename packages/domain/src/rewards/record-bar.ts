import {
  recordInstrumentSchema,
  type IsoDate,
  type IsoWeek,
  type RecordBarRow,
} from '../contracts';
import { DAY_MS } from '../day';

/** Monday's instrument first: keys, bassline, marimba, drums, whistle, bells, then Sunday's choir. */
export const INSTRUMENT_BY_WEEKDAY = recordInstrumentSchema.options;

export type RecordBar = Pick<RecordBarRow, 'localDate' | 'week' | 'position' | 'instrument'>;

/** The ISO week a day belongs to, and its weekday from 1 (Monday) to 7 (Sunday). */
export function isoWeekOf(date: IsoDate): { readonly week: IsoWeek; readonly weekday: number } {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
  const at = new Date(Date.UTC(year, month - 1, day));
  const weekday = at.getUTCDay() || 7;
  // An ISO week belongs to the year its Thursday falls in.
  at.setUTCDate(at.getUTCDate() + 4 - weekday);
  const weekYear = at.getUTCFullYear();
  const number = Math.ceil(((at.getTime() - Date.UTC(weekYear, 0, 1)) / DAY_MS + 1) / 7);
  return { week: `${weekYear}-W${String(number).padStart(2, '0')}`, weekday };
}

/** The bar a finished day adds to its week's record, played by that weekday's instrument. */
export function recordBarFor(localDate: IsoDate): RecordBar {
  const { week, weekday } = isoWeekOf(localDate);
  const instrument = INSTRUMENT_BY_WEEKDAY[weekday - 1] ?? 'keys';
  return { localDate, week, position: weekday, instrument };
}
