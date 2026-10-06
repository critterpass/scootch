import type { Language } from '../contracts';

import type { WorkMode } from './table-contract';

/**
 * What a seat shows for each work mode: one or two plain words, written here and nowhere else.
 * A label is never model-written and never comes from a phone, so it cannot hold a task.
 */
export const workModeLabels: Readonly<Record<WorkMode, Readonly<Record<Language, string>>>> = {
  email: { en: 'email', vi: 'email' },
  writing: { en: 'writing', vi: 'viết lách' },
  reading: { en: 'reading', vi: 'đọc' },
  studying: { en: 'studying', vi: 'học bài' },
  coding: { en: 'coding', vi: 'viết code' },
  calling: { en: 'a call', vi: 'gọi điện' },
  texting: { en: 'messages', vi: 'nhắn tin' },
  money: { en: 'money', vi: 'tiền nong' },
  paperwork: { en: 'admin', vi: 'giấy tờ' },
  research: { en: 'research', vi: 'tìm hiểu' },
  meeting: { en: 'a meeting', vi: 'họp' },
  presenting: { en: 'slides', vi: 'thuyết trình' },
  designing: { en: 'designing', vi: 'thiết kế' },
  music: { en: 'music', vi: 'âm nhạc' },
  cleaning: { en: 'cleaning', vi: 'dọn dẹp' },
  dusting: { en: 'dusting', vi: 'lau bụi' },
  laundry: { en: 'laundry', vi: 'giặt đồ' },
  dishes: { en: 'dishes', vi: 'rửa bát' },
  cooking: { en: 'cooking', vi: 'nấu ăn' },
  groceries: { en: 'groceries', vi: 'đi chợ' },
  decluttering: { en: 'tidying', vi: 'dọn bớt' },
  parcel: { en: 'a parcel', vi: 'gửi hàng' },
  diy: { en: 'fixing', vi: 'sửa chữa' },
  plants: { en: 'plants', vi: 'cây cối' },
  pets: { en: 'pets', vi: 'thú cưng' },
  exercise: { en: 'exercise', vi: 'tập luyện' },
  stretch: { en: 'stretching', vi: 'giãn cơ' },
  selfcare: { en: 'self-care', vi: 'chăm mình' },
  trip: { en: 'a trip', vi: 'chuyến đi' },
  rest: { en: 'resting', vi: 'nghỉ ngơi' },
};

/** What a seat shows when its person has hidden their label. */
export const hiddenLabel: Readonly<Record<Language, string>> = { en: 'busy', vi: 'đang bận' };

/**
 * The label one viewer sees on a seat. No work mode (a serious or unscreened task) shows
 * nothing at all.
 */
export function seatLabel(
  seat: { readonly workMode: WorkMode | null; readonly hidden: boolean },
  language: Language,
): string {
  if (seat.hidden) return hiddenLabel[language];
  return seat.workMode === null ? '' : workModeLabels[seat.workMode][language];
}

/** Every string a label can ever be. */
export const everyLabel: ReadonlySet<string> = new Set([
  '',
  ...Object.values(hiddenLabel),
  ...Object.values(workModeLabels).flatMap((label) => Object.values(label)),
]);
