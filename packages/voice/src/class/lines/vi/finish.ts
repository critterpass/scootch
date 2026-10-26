import type { LinePack } from '../../types';

/** The finish, recess and partial credit. */
export const finish: Pick<
  LinePack,
  | 'commentFine'
  | 'commentGood'
  | 'commentGoodWork'
  | 'commentTen'
  | 'next'
  | 'recessOffered'
  | 'recessOver'
  | 'partialCredit'
  | 'partialAnotherPeriod'
  | 'partialBackOnBoard'
  | 'partialErase'
  | 'partialNotePrompt'
  | 'partialNoteReturns'
> = {
  commentFine: ['Được.'],
  commentGood: ['Khá.'],
  commentGoodWork: ['Tốt lắm.'],
  commentTen: [],
  next: ['Bài tiếp.'],
  recessOffered: [
    'Ra chơi. Năm phút.',
    'Ra chơi. Vươn vai. Uống nước. Nhìn ra cửa sổ.',
    'Ra chơi năm phút. Thầy đi pha trà.',
    'Ra chơi, nếu em muốn.',
  ],
  recessOver: ['Tùng. Vào lớp.', 'Hết giờ ra chơi. Vào chỗ.', 'Trống rồi. Về chỗ.'],
  partialCredit: [
    'Chưa xong. Không sao.',
    'Chưa xong thì để đó. Được một phần rồi.',
    'Nửa trang vẫn là trang.',
  ],
  partialAnotherPeriod: ['Thêm một tiết'],
  partialBackOnBoard: ['Để lên bảng'],
  partialErase: ['Xoá'],
  partialNotePrompt: [
    'Một dòng cho lần sau.',
    'Để lại một dòng. Em đang dừng ở đâu?',
    'Ghi chỗ em dừng. Một dòng thôi.',
  ],
  partialNoteReturns: [
    'Em có để lại một dòng.',
    'Dòng em để lại, nguyên văn.',
    'Đọc dòng em ghi trước đã.',
  ],
};
