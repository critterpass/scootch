import type { LinePack } from '../../types';

/**
 * Lời thầy ghi vào sổ liên lạc khi em chọn chia sẻ một việc đã xong: hôm nay em làm gì, việc đó đã
 * chờ bao lâu. Ngắn, đúng mực, khô.
 */
export const share: Pick<LinePack, 'shareNoteDone' | 'shareNoteWaited' | 'shareNoteSameDay'> = {
  shareNoteDone: [
    'Kính gửi phụ huynh em {name}. Hôm nay em đã làm xong: {task}.',
    'Kính gửi phụ huynh em {name}. Bài hôm nay em đã hoàn thành: {task}.',
    'Gửi phụ huynh em {name}. Trong giờ của thầy hôm nay, em đã xong: {task}.',
  ],
  shareNoteWaited: [
    'Việc này đã chờ {waited}. Hiện tại thầy không có gì phàn nàn.',
    'Việc này nằm trên bảng suốt {waited}. Thầy không có gì phàn nàn thêm.',
    'Đã chờ {waited}. Thầy không có ý kiến gì thêm.',
  ],
  shareNoteSameDay: [
    'Giao và xong ngay trong ngày. Hiện tại thầy không có gì phàn nàn.',
    'Việc này không phải chờ. Thầy không có gì phàn nàn.',
    'Nói là làm, xong trong ngày. Thầy không có ý kiến gì thêm.',
  ],
};
