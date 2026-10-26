import type { LinePack } from '../../types';

/** Why a task is on the desk, and hearing one. */
export const pick: Pick<
  LinePack,
  | 'pickDueToday'
  | 'pickWaitedLongest'
  | 'pickSlippedMost'
  | 'pickFitsTime'
  | 'swapAllowed'
  | 'firstThingToDesk'
  | 'deadlineHeard'
  | 'timeHeard'
  | 'writtenDown'
  | 'shortTap'
> = {
  pickDueToday: [
    'Hạn hôm nay. Làm trước.',
    'Việc này hạn hôm nay. Khỏi bàn.',
    'Hôm nay là hạn. Vậy thì hôm nay.',
    'Hạn hôm nay. Lịch nói thế rồi.',
  ],
  pickWaitedLongest: [
    'Việc này chờ lâu nhất. Đến lượt nó.',
    'Lâu nhất trên bảng. Có thâm niên đấy.',
    'Nó nằm đây từ trước chén trà. Làm trước.',
    'Chờ lâu nhất thì được lên bàn.',
  ],
  pickSlippedMost: [
    'Nhiều vạch nhất bảng. Lên bàn.',
    'Việc này gom được nhiều lý do nhất.',
    'Nó nhiều vạch hơn tóc thầy.',
    'Khất nhiều nhất. Lần này thử không khất xem.',
  ],
  pickFitsTime: [
    'Rảnh {minutes} phút. Việc này vừa.',
    'Em có {minutes} phút. Việc này cũng thế.',
    'Vừa đúng {minutes} phút. Thầy đo rồi.',
  ],
  swapAllowed: [
    'Được. Vậy làm {task}.',
    'Đổi à. Cho phép.',
    'Em chọn. Thầy coi như đồng ý.',
    'Vậy {task}. Việc kia đợi.',
    'Đổi rồi. Thứ tự của thầy hay hơn.',
  ],
  firstThingToDesk: [
    'Nói trước thì lên bàn trước.',
    '{task}. Lên bàn.',
    'Việc đầu tiên. Ngồi bàn đầu.',
  ],
  deadlineHeard: [
    '{date}. Thầy ghi vào góc bảng.',
    'Hạn {date}. Đúng hôm đó thầy mang ra.',
    '{task}, hạn {date}. Góc bảng có rồi.',
    '{date}. Cái bảng sẽ nhắc cả thầy lẫn em.',
  ],
  timeHeard: [
    '{time}. Thầy cho tan lớp kịp giờ.',
    '{time}. Thầy cho về sớm mà chuẩn bị.',
    '{time}, thầy nhớ rồi. Em đi cho kịp.',
  ],
  writtenDown: ['Thầy ghi rồi.', 'Lên bảng rồi.', 'Đã ghi.'],
  shortTap: ['Giữ nút rồi hẵng nói.'],
};
