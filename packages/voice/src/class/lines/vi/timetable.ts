import type { LinePack } from '../../types';

/** Thời khóa biểu và học bạ. */
export const timetable: Pick<LinePack, 'timetableAsk' | 'timetableWeekend' | 'reportCardComment'> =
  {
    timetableAsk: [
      'Cho thầy xem lịch. Thầy chỉ xếp tiết trống, không sửa gì.',
      'Đưa thầy xem lịch. Thầy đọc thôi, không đụng vào.',
      'Lịch của em đâu. Thầy chỉ xem, không sửa.',
    ],
    timetableWeekend: [
      'Muốn làm một việc thì: {task}.',
      'Nếu thích, một việc thôi: {task}.',
      'Một việc nhỏ, nếu em muốn: {task}.',
    ],
    reportCardComment: [
      'Có nộp bài. Trống trường không phàn nàn gì.',
      'Bàn có thêm hình khắc. Trà thầy hài lòng.',
      'Ngồi xuống là cầm phấn. Thế là được.',
    ],
  };
