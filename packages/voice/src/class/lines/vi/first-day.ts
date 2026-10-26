import type { LinePack } from '../../types';

/** The first day, and coming back. */
export const firstDay: Pick<
  LinePack,
  | 'firstDayClass'
  | 'firstDaySit'
  | 'rollCallAsk'
  | 'rollCallRepeat'
  | 'notesHomeAsk'
  | 'notesHomeExample'
  | 'notesHomeNotNow'
  | 'firstDayEmptyDesk'
  | 'comingBack'
> = {
  firstDayClass: ['Lớp 11A. Sĩ số: 1.'],
  firstDaySit: ['Ngồi.'],
  rollCallAsk: ['Họ và tên em?', 'Đọc to họ tên đầy đủ.', 'Họ tên đầy đủ, để thầy vào sổ.'],
  rollCallRepeat: [
    '{name}. Thầy nhớ rồi.',
    '{name}. Tên học trò thầy không quên.',
    '{name}. Được. Thầy nhớ.',
  ],
  notesHomeAsk: [
    'Thầy hay viết sổ liên lạc. Cho phép chứ?',
    'Thầy gửi vài dòng về nhà. Được không?',
    'Sổ liên lạc, ngắn thôi. Em đồng ý chứ?',
  ],
  notesHomeExample: [
    '{task} vẫn nằm trên bàn. Trà thầy cũng thế.',
    '{task}. Thầy vẫn cầm thước.',
    '{task}. Hai phút, lúc nào em sẵn sàng.',
  ],
  notesHomeNotNow: [
    'Được. Thầy để trong túi áo.',
    'Thầy hiểu. Bàn vẫn thế.',
    'Chưa thì thôi. Đợi là nghề của thầy.',
  ],
  firstDayEmptyDesk: ['Bàn trống rồi. Em đang né việc gì nào?'],
  comingBack: ['Ngồi.'],
};
