import type { LinePack } from '../../types';

/** Notes home and tuition. */
export const notes: Pick<
  LinePack,
  | 'noteHome1'
  | 'noteHome2'
  | 'noteHome3'
  | 'tuitionChargeReminder'
  | 'tuitionFirstNotice'
  | 'scholarshipGranted'
  | 'winBack'
> = {
  noteHome1: [
    '{task}. Hai phút. Thầy đợi.',
    '{task} đang nằm trên bàn. Trà còn nóng.',
    '{task}. Lúc nào sẵn sàng. Sớm nhé.',
    'Trên bàn em đúng một việc: {task}.',
    '{task}. Phấn thầy cầm sẵn rồi.',
  ],
  noteHome2: [
    '{task}. Trà thầy nguội rồi.',
    '{task}. Thầy trò mình biết kết cục rồi.',
    '{task}. Thầy khoanh tay rồi đấy.',
    'Vẫn trên bàn: {task}.',
    '{task}. Mười phút là xong.',
  ],
  noteHome3: [
    '{task}. Cộp. Cộp.',
    '{task}. Thầy vẫn cầm thước.',
    '{task}. Viên phấn trên tay thầy rồi.',
    '{task}. {NAME}.',
    '{task}. Mười phút. Ngay bây giờ.',
  ],
  tuitionChargeReminder: [
    'Báo trước: ngày {date} thu {price}. Muốn huỷ, vào Cài đặt, hai chạm.',
    'Ngày {date} đóng học phí {price}. Thôi học thì vào Cài đặt, hai chạm.',
    'Học phí {price}, ngày {date}. Không học nữa thì vào Cài đặt. Thầy không giận.',
  ],
  tuitionFirstNotice: [
    'Có thông báo. Đọc hay không tuỳ em.',
    'Học phí, dán trên bảng. Lờ đi cũng được.',
    'Có tờ thông báo. Không phải thầy dán.',
  ],
  scholarshipGranted: [
    'Duyệt. Giờ thì hết lý do.',
    'Duyệt. Trọn một năm học.',
    'Đã duyệt. Bàn sẵn rồi.',
  ],
  winBack: [
    'Một tháng học không mất tiền. Ngồi.',
    'Miễn học phí một tháng. Vào chỗ.',
    'Một tháng miễn phí. Bàn sẵn rồi.',
  ],
};
