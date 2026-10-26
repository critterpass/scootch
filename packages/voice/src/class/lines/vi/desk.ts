import type { LinePack } from '../../types';

/** The desk, by pressure. */
export const desk: Pick<
  LinePack,
  'pressure0' | 'pressure1' | 'pressure2' | 'pressure3' | 'pressure4' | 'pressure5'
> = {
  pressure0: [
    'Hai phút. Thầy đợi.',
    'Hai phút. Thầy không vội.',
    'Hai phút. Phấn sẵn rồi.',
    '{task}. Hai phút. Thầy đợi.',
    'Thầy đợi được. Ba mươi hai năm đứng lớp rồi.',
    'Lúc nào sẵn sàng thì làm. Trong hai phút.',
    'Bàn dọn xong rồi. Thầy cũng xong rồi.',
    'Hai phút. Thầy rót trà rồi đấy.',
    'Trên bàn một việc. Hai phút thôi.',
  ],
  pressure1: [
    'Lúc em ngồi xuống, trà này còn nóng.',
    'Thầy rót chén thứ hai rồi.',
    'Trà thầy nguội dần. {task} thì vẫn nằm đó.',
    'Thầy uống trà cả ngày được. Nhưng thôi.',
    'Phích trà vơi nửa rồi. Bàn thì chưa vơi.',
    'Trà âm ấm rồi. Thầy nói trà thôi.',
    'Thầy đang uống chén kiên nhẫn thứ hai.',
    'Thầy nhìn qua gọng kính rồi đấy.',
  ],
  pressure2: [
    'Thầy trò mình đều biết chuyện này kết thúc thế nào.',
    'Đằng nào cũng phải làm. Làm luôn đi.',
    '{task} không tự làm được đâu. Thầy thử rồi.',
    'Khoanh tay rồi đấy. Cảnh cáo chỉ có thế.',
    'Thầy khoanh tay rồi. Chuyện nghiêm túc đây.',
    'Mười phút là xong. Thầy cược chén trà.',
    'Chống nạnh rồi. Cổ điển, nhưng vẫn hiệu quả.',
    'Bài này thầy đọc rồi. Kết bài là {task} xong.',
  ],
  pressure3: [
    'Cộp. Cộp.',
    'Cộp. Cộp. Cộp.',
    'Cây thước bắt đầu vào cuộc.',
    'Cộp. Đấy là cái nhẹ nhàng.',
    'Cây thước này có ý kiến về {task}.',
    'Cộp. Cộp. {task}.',
    'Một. Hai…',
    'Thầy đang đếm. Đếm thầm. Tạm thời.',
  ],
  pressure4: ['{NAME}.', '{NAME}. {task}.', '{NAME}. Vào bàn. Ngay.', '{NAME}. Bút. Giấy. Làm.'],
  pressure5: ['...'],
};
