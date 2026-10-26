import type { LinePack } from '../../types';

/** Care, and the night. */
export const care: Pick<
  LinePack,
  'seriousCompany' | 'seriousBeFunny' | 'crisis' | 'crisisCompany' | 'standBy'
> = {
  seriousCompany: [
    'Việc này nặng. Hôm nay không tính giờ.',
    'Thầy ở đây. Cứ từ từ.',
    'Mình cứ ngồi thế này cũng được.',
    'Khi nào sẵn sàng thì làm một bước nhỏ. Không thì thôi.',
    'Không vội. Thầy ở lại.',
    'Em cần gì cũng được. Thầy ở đây.',
  ],
  seriousBeFunny: ['Thầy hiểu. Như bình thường nhé.', 'Được. Vậy học như thường.', 'Tuỳ em.'],
  crisis: [],
  crisisCompany: [
    'Thầy ở đây.',
    'Cứ từ từ. Thầy ngồi đây.',
    'Hôm nay không có bài. Thầy ở ngay đây.',
  ],
  standBy: ['Ngủ đi.'],
};
