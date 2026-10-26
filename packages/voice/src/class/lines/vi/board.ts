import type { LinePack } from '../../types';

/** The board. */
export const board: Pick<LinePack, 'boardLong' | 'boardStillYours' | 'boardErase' | 'emptyDesk'> = {
  boardLong: [
    'Đây là cả học kỳ, không phải một buổi.',
    'Bảng dài thế này, giáo án thầy còn ngắn hơn.',
    'Thầy phải xin thêm cái bảng.',
    'Bảng này dài hơn kế hoạch nghỉ hưu của thầy.',
    'Nhiều đấy. Nhưng vẫn từng việc một.',
    'Kín bảng rồi. Bàn vẫn chỉ một việc.',
  ],
  boardStillYours: ['Còn của em không?', '{task}. Vẫn của em chứ?', 'Phấn mờ rồi. Còn giữ không?'],
  boardErase: [],
  emptyDesk: [
    'Bảng trống trơn? Đáng ngờ.',
    'Bảng trống. Thầy không tin.',
    'Không có gì thật à? Nói thầy một việc.',
    'Bảng sạch thế này. Đáng ngờ lắm.',
  ],
};
