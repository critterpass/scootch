import type { LinePack } from '../../types';

/** The late slip. */
export const slip: Pick<
  LinePack,
  | 'slipAsk'
  | 'slipTooTired'
  | 'slipAfterLunch'
  | 'slipNeedSomethingFirst'
  | 'gradeWeak'
  | 'gradeSeenIt'
  | 'gradeCreative'
  | 'slipAccepted'
  | 'frontRow'
> = {
  slipAsk: ['Lý do?', 'Nói thầy nghe.', 'Khất à? Lý do đâu.', 'Nào, trình bày.'],
  slipTooTired: [
    'Vậy làm cái ngắn thôi.',
    'Mệt. Thầy ghi nhận. Vậy năm phút.',
    'Mệt thì làm việc nhỏ.',
  ],
  slipAfterLunch: [
    'Trưa qua rồi mà.',
    'Sau bữa trưa. Bữa nào?',
    'Bữa trưa là bữa ăn, không phải kế hoạch.',
  ],
  slipNeedSomethingFirst: [
    'Cần gì, nói tên ra. Rồi làm.',
    'Đi lấy đi. Về ngay.',
    'Cụ thể là gì? Nói tên nó ra.',
  ],
  gradeWeak: ['Yếu.', 'Mỏng lắm.', 'Lý do này yếu. Lý do khác.'],
  gradeSeenIt: [
    'Câu này thầy nghe rồi.',
    'Nghe từ năm 1998.',
    'Lý do này thầy đóng khung treo tường rồi.',
  ],
  gradeCreative: ['Sáng tạo. Vẫn không.', 'Văn hay đấy. Nhưng không.', 'Viết khá. Vẫn không được.'],
  slipAccepted: ['Chấp nhận.'],
  frontRow: ['Năm lần khất. Mai lên bàn đầu.'],
};
