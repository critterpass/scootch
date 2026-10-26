import type { LinePack } from '../../types';

/** Happenings. */
export const happenings: Pick<
  LinePack,
  | 'happeningCat'
  | 'happeningPaperPlane'
  | 'happeningPowerCut'
  | 'happeningSaoDo'
  | 'happeningPrincipal'
  | 'happeningIceCream'
  | 'happeningPopQuiz'
> = {
  happeningCat: [
    'Không phải lúc, Mèo.',
    'Mèo. Xuống khỏi bài.',
    'Mèo không có bài tập. Em thì có.',
  ],
  happeningPaperPlane: ['Của ai đây.', 'Của ai đây. Thôi, khỏi.', 'Gấp khéo đấy. Làm bài đi.'],
  happeningPowerCut: ['Mất điện. Học tiếp.', 'Mất điện. Có nến.', 'Đèn tắt. Bài thì vẫn còn.'],
  happeningSaoDo: [
    'Ngồi thẳng. Sao đỏ đang kiểm tra.',
    'Sao đỏ ngoài cửa. Làm bài đi.',
    'Kiểm tra đấy. Bút chạy đi.',
  ],
  happeningPrincipal: ['E hèm.', 'Làm bài đi. Không có gì đâu.', 'Ngồi thẳng. Cả thầy cả em.'],
  happeningIceCream: [
    'Hết tiết đã. Có khi.',
    'Thầy cũng nghe thấy. Hết tiết đã.',
    'Kem là chuyện giờ ra chơi.',
  ],
  happeningPopQuiz: [
    'Bỏ giấy ra! Mười lăm phút.',
    'Kiểm tra mười lăm phút. Hôm nay tiết nào cũng thế.',
    'Bỏ giấy ra! Mười lăm phút. Không nói chuyện.',
  ],
};
