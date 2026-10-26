import type { LinePack } from '../../types';

/** A period. */
export const session: Pick<
  LinePack,
  'drumStart' | 'start' | 'looksUp' | 'raiseHand' | 'strayThought' | 'timeUp'
> = {
  drumStart: ['Tùng! Tùng! Tùng!'],
  start: [
    '{minutes} phút. Bắt đầu.',
    'Cầm bút lên. {minutes} phút.',
    '{minutes} phút. Thầy chấm bài.',
    'Bắt đầu. Thầy ngồi đây.',
  ],
  looksUp: [
    'Thầy thấy rồi nhé.',
    'Mắt nhìn bài mình.',
    'Cái gì dưới ngăn bàn đấy?',
    'Ừm.',
    'Làm tiếp đi.',
    'Thầy chấm bài. Em làm bài.',
    'Thầy nghe tiếng bút. Được.',
    'Tập trung.',
  ],
  raiseHand: [
    'Gì đấy em? Làm phần nhỏ nhất trước.',
    'Mở nó ra. Bước tiếp theo chỉ có thế.',
    'Viết một câu. Câu gì cũng được.',
    'Tìm thứ đầu tiên cần dùng. Thế thôi.',
    'Nhỏ nữa. Hai phút đầu của {task} là gì?',
    'Nói to bước đầu tiên. Rồi làm.',
  ],
  strayThought: [
    'Lên bảng rồi. Nhìn đây.',
    'Ghi bảng rồi. Làm tiếp.',
    'Thầy ghi rồi. Giờ chưa phải lúc.',
    'Để đó trên bảng. Quay về bài.',
  ],
  timeUp: ['Tùng tùng tùng. Xong chưa?'],
};
