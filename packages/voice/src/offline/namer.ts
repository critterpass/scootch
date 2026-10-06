import type { Language, MonsterBodyType } from '@scootch/domain';

import { offlinePacks } from './index';

/** What each monster body is called when no model named the monster. */
const bodyWords: Readonly<Record<Language, Readonly<Record<MonsterBodyType, string>>>> = {
  en: {
    tooth: 'Tooth',
    envelope: 'Envelope',
    bubble: 'Bubble',
    receipt: 'Receipt',
    scroll: 'Scroll',
    slime: 'Slime',
    sock: 'Sock',
    dust: 'Dust',
    phone: 'Phone',
    weed: 'Weed',
    beetle: 'Beetle',
    pot: 'Pot',
    bolt: 'Bolt',
    clock: 'Clock',
    kettle: 'Kettle',
    splat: 'Splat',
    note: 'Note',
    hairball: 'Hairball',
    box: 'Box',
    pillow: 'Pillow',
  },
  vi: {
    tooth: 'Răng Sún',
    envelope: 'Lá Thư',
    bubble: 'Tin Nhắn',
    receipt: 'Hoá Đơn',
    scroll: 'Cuộn Giấy',
    slime: 'Nhớt',
    sock: 'Chiếc Vớ',
    dust: 'Bụi',
    phone: 'Điện Thoại',
    weed: 'Cỏ Dại',
    beetle: 'Bọ',
    pot: 'Cái Nồi',
    bolt: 'Con Ốc',
    clock: 'Đồng Hồ',
    kettle: 'Ấm Nước',
    splat: 'Vệt Loang',
    note: 'Tờ Ghi Chú',
    hairball: 'Cục Lông',
    box: 'Cái Hộp',
    pillow: 'Cái Gối',
  },
};

/**
 * A monster name made in code: the body's word and a title from the offline pool, as "Name,
 * Title". The same body and seed always give the same name. With no body, a whole offline name.
 */
export function offlineMonsterName(
  language: Language,
  bodyType: MonsterBodyType | null,
  seed: number,
): string {
  const names = offlinePacks[language].monsterNames;
  const whole = names[(seed >>> 0) % names.length] ?? names[0];
  if (bodyType === null) return whole;
  const title = whole.slice(whole.indexOf(',') + 1).trim();
  return `${bodyWords[language][bodyType]}, ${title}`;
}
