import type { Catalogue } from './catalogue-types';

/** Vietnamese interface strings: every English key, written as a Vietnamese app would say it. */
export const vi: Catalogue = {
  'brand.name': 'Lớp Thầy Phú',

  // The desk.
  'desk.sit': 'Ngồi.',

  // Helplines: the days, hours and zones their opening times are written in.
  'care.day.fri': 'Thứ 6',
  'care.day.mon': 'Thứ 2',
  'care.day.sat': 'Thứ 7',
  'care.day.sun': 'Chủ nhật',
  'care.day.thu': 'Thứ 5',
  'care.day.tue': 'Thứ 3',
  'care.day.wed': 'Thứ 4',
  'care.helpline.closedNow': 'Hiện đang đóng. Giờ mở: {hours}',
  'care.helpline.forChildren': 'Dành cho trẻ em và người chăm sóc trẻ',
  'care.helpline.hours.always': 'Mở cả ngày lẫn đêm, mọi ngày',
  'care.helpline.hours.dayRange': '{first} đến {last}',
  'care.helpline.hours.everyDay': 'Hằng ngày',
  'care.helpline.hours.weekly': '{days}, {from}–{to}, {zone}',
  'care.helpline.zone.vietnam': 'giờ Việt Nam',
};
