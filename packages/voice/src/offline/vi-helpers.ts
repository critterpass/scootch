import { saidBack } from './said-back';
import type { HelperLines, OfflinePack } from './types';

/** Mấy dòng giọng nào cũng nói khẽ như nhau. */
const quiet = {
  guessNote: 'Đoán thử thôi, trước khi bắt đầu.',
  nextTimeAsk: 'Lần tới, bắt đầu bằng…',
  bitesLast: 'Đang mở màn tóm quái…',
  widgetRest: 'Không có gì đang chờ.',
  widgetJoined: '{name} vừa dọn vào ở.',
} as const satisfies Partial<HelperLines>;

/** Viết bằng tiếng Việt. Soft xưng "mình"; Cheeky và Unhinged xưng "tui". */
export const viHelpers: Pick<
  OfflinePack,
  'helpers' | 'plainHelpers' | 'timeSaidBack' | 'getReady'
> = {
  helpers: {
    soft: {
      ...quiet,
      guessAsk: 'Bạn đoán việc này mất bao lâu?',
      inTheWayBoring: 'Chán cũng phải thôi. Mình ngồi sát bên, làm cho nó bớt nhạt một chút nha.',
      inTheWayScary: 'Việc đáng sợ thì chỉ cần mở ra thôi. Cứ mở nó ra, mình ở ngay đây.',
      inTheWayConfusing:
        'Vậy mình bắt đầu bằng một câu hỏi nha. Ghi ra điều bạn cần biết trước nhất.',
      inTheWayTooBig: 'Vậy mình làm nó nhỏ lại. Mình chỉ xin một miếng nhỏ thôi.',
      cue: '{cue}, bạn dặn vậy mà. Mình tới rồi nè.',
      timeHeardPlan:
        'Mình sẽ cho buổi làm kết thúc kịp lúc để bạn chuẩn bị, và nhắc bạn đúng một lần.',
      nextTimeNote: 'Không bắt buộc. Lần tới mình đưa bạn xem trước tiên, y nguyên từng chữ.',
      nextStartOpening: 'Bạn để sẵn một lối vào rồi nè. Bắt đầu từ đó nha, mình ngồi ngay cạnh.',
      bitesStart: 'Bắt đầu với miếng đầu tiên nha.',
      bitesNext: 'Xong {count} miếng rồi. Xong miếng kế thì đánh dấu nha.',
    },
    cheeky: {
      ...quiet,
      guessAsk: 'Việc này mất bao lâu, đoán thử coi?',
      inTheWayBoring: 'Chán hả? Càng tốt. Tui làm lố đủ cho cả hai đứa.',
      inTheWayScary: 'Sợ hả? Vậy mình chỉ mở nó ra thôi. Cứ mở đi, tui ngó trước cho.',
      inTheWayConfusing: 'Rối hả? Vậy bước một là một câu hỏi. Ghi ra đúng một điều bạn cần hỏi.',
      inTheWayTooBig: 'To quá hả? Vậy cho nó teo lại. Một miếng thôi, tui cầm nĩa sẵn rồi.',
      cue: '{cue}, bạn dặn vậy đó nha. Tui có mặt rồi nè.',
      timeHeardPlan: 'Tui sẽ cho buổi làm kết thúc kịp để bạn chuẩn bị, và nhắc đúng một lần thôi.',
      nextTimeNote: 'Không bắt buộc. Lần tới tui đưa bạn xem trước tiên, y nguyên từng chữ.',
      nextStartOpening:
        'Lời nhắn bạn tự để lại, còn y nguyên. Bắt đầu từ đó đi, con quái để tui canh.',
      bitesStart: 'Bắt đầu với miếng đầu tiên đi.',
      bitesNext: 'Xong {count} miếng. Xong miếng kế thì đánh dấu nha.',
    },
    unhinged: {
      ...quiet,
      guessAsk: 'VIỆC NÀY MẤT BAO LÂU? Đoán đi, tui ghi sổ liền.',
      inTheWayBoring: 'CHÁN HẢ? TUYỆT VỜI. Tui làm lố đủ cho nguyên cái chung cư.',
      inTheWayScary: 'SỢ HẢ. Được. Mình chỉ mở nó ra thôi. CỨ MỞ ĐI. Tui đứng chắn phía trước.',
      inTheWayConfusing: 'RỐI HẢ. Vậy bước một là ĐÚNG MỘT CÂU HỎI. Ghi ra điều bạn cần hỏi.',
      inTheWayTooBig: 'TO QUÁ HẢ. VẬY CHO NÓ TEO LẠI. Một miếng thôi. Tui có cái nĩa bé xíu.',
      cue: '{cue}, BẠN DẶN VẬY ĐÓ. TUI CÓ MẶT. Có ghế luôn.',
      timeHeardPlan:
        'TUI SẼ CHO BUỔI LÀM KẾT THÚC KỊP để bạn chuẩn bị, và nhắc đúng một lần. MỘT LẦN.',
      nextTimeNote: 'Không bắt buộc. Lần tới tui đưa bạn xem trước tiên, Y NGUYÊN TỪNG CHỮ.',
      nextStartOpening: 'LỜI NHẮN BẠN TỰ ĐỂ LẠI, còn y nguyên. Bắt đầu từ đó đi. Tui canh nó cho.',
      bitesStart: 'BẮT ĐẦU VỚI MIẾNG ĐẦU TIÊN.',
      bitesNext: 'XONG {count} MIẾNG. Xong miếng kế thì đánh dấu nha.',
    },
  },
  plainHelpers: {
    cue: '{cue}, bạn dặn vậy. Mình ở đây khi bạn sẵn sàng.',
    timeHeardPlan: 'Mình sẽ cho buổi làm kết thúc kịp lúc để bạn chuẩn bị, và nhắc bạn một lần.',
    nextTimeAsk: quiet.nextTimeAsk,
    nextTimeNote: 'Không bắt buộc. Lần tới mình đưa bạn xem trước tiên, y nguyên từng chữ.',
    nextStartOpening: 'Đây là lời nhắn bạn để lại. Mình bắt đầu từ đó cũng được. Mình ở đây.',
  },
  timeSaidBack: saidBack,
  getReady: (heardAs) => `${saidBack(heardAs)} Tới giờ chuẩn bị rồi.`,
};
