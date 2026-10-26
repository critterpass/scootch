import type { Catalogue } from './catalogue-types';

/** Vietnamese interface strings: every English key, written as a Vietnamese app would say it. */
export const vi: Catalogue = {
  'brand.name': 'Lớp Thầy Phú',

  // The desk.
  'desk.sit': 'Ngồi.',

  // The board.
  'board.action.desk': 'Lên bàn',
  'board.action.erase': 'Xóa',
  'board.action.tick': 'Xong',
  'board.close': 'Đẩy bảng lên lại',
  'board.close.hint': 'Về lại bàn',
  'board.empty.hint': 'Nói với thầy một việc ở bàn.',
  'board.frontRow': 'Bàn đầu',
  'board.logbook': 'Sổ đầu bài',
  'board.logbookHint.pull': 'Kéo xuống để mở sổ',
  'board.logbookHint.release': 'Thả tay để mở sổ',
  'board.menu.close': 'Đóng',
  'board.menu.desk': 'Đặt lên bàn',
  'board.menu.erase': 'Xóa đi',
  'board.menu.reword': 'Viết lại',
  'board.menu.tick': 'Gạch là xong',
  'board.reword.field': 'Việc cần làm, theo cách bạn viết',
  'board.reword.save': 'Lưu',
  'board.row.actionsHint': 'Chạm hai lần để chọn việc cần làm, hoặc vuốt sang trái.',
  'board.row.due': 'Hạn {date}',
  'board.row.faded': 'Phấn đã mờ',
  'board.row.onDesk': 'Đang trên bàn',
  'board.row.slips': { other: '{count} lần xin hoãn' },
  'board.stillYours.keep': 'Giữ',
  'board.stillYours.letGo': 'Bỏ',
  'board.timetable': 'Thời khóa biểu',
  'board.title': 'Bảng đen',
  'board.today': 'Hôm nay',

  // The logbook.
  'logbook.certificate': 'Được giấy khen',
  'logbook.close': 'Đẩy sổ lên lại',
  'logbook.close.hint': 'Về lại bảng',
  'logbook.empty.body': 'Xong một việc, thầy sẽ ký vào đây.',
  'logbook.empty.title': 'Chưa có gì được ký.',
  'logbook.minutes': '{minutes} phút',
  'logbook.signed': 'Thầy Phú đã ký',
  'logbook.ten': 'Điểm 10, khoanh đỏ',
  'logbook.ticked': 'Gạch khỏi bảng',
  'logbook.title': 'Sổ đầu bài',
  'logbook.week': 'Tuần {week}',

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
