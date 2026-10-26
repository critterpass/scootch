import type { Language } from '@phusclass/i18n';

/**
 * The few lines the home page's chalkboard can say about a task typed into it: a small offline set
 * in his voice, about the task and never about the person. A kind is found by words in the task;
 * anything else gets a general line.
 */
export interface ChalkKind {
  readonly words: readonly string[];
  readonly lines: readonly string[];
}

export interface ChalkLines {
  readonly kinds: readonly ChalkKind[];
  readonly general: readonly string[];
}

const en: ChalkLines = {
  kinds: [
    {
      words: ['email', 'e-mail', 'reply', 'inbox', 'message', 'text'],
      lines: [
        'An email. Three sentences. I have marked longer excuses.',
        'The inbox has waited. So has my tea.',
      ],
    },
    {
      words: ['call', 'phone', 'ring'],
      lines: [
        'A phone call takes four minutes. Dreading it has taken longer.',
        'Dial first. Rehearse after.',
      ],
    },
    {
      words: ['clean', 'tidy', 'laundry', 'dishes', 'wash', 'vacuum', 'room'],
      lines: [
        'The dishes have not washed themselves since 1994. I checked.',
        'One corner. Then the next corner.',
      ],
    },
    {
      words: ['pay', 'bill', 'tax', 'taxes', 'invoice', 'rent', 'form'],
      lines: [
        'Paperwork. It does not get shorter on the board.',
        'A form. Name, date, signature. I will hold the pen.',
      ],
    },
    {
      words: ['write', 'essay', 'report', 'draft', 'thesis', 'paper', 'blog'],
      lines: [
        'One bad sentence. Then a better one. That is all writing is.',
        'A blank page is not a reason. I grade reasons.',
      ],
    },
    {
      words: ['study', 'read', 'revise', 'homework', 'exam', 'learn', 'practice'],
      lines: [
        'Open the book. Page one. I’ll wait.',
        'Thirty-two years of homework. This one goes first.',
      ],
    },
    {
      words: ['gym', 'run', 'exercise', 'walk', 'workout', 'stretch', 'yoga'],
      lines: [
        'Shoes first. The rest follows the shoes.',
        'Ten minutes. My retirement is further away.',
      ],
    },
    {
      words: ['book', 'appointment', 'dentist', 'haircut', 'renew', 'passport', 'schedule'],
      lines: [
        'Booking it takes two minutes. I have timed it.',
        'It has a form and a button. Press the button.',
      ],
    },
  ],
  general: [
    'On the desk. Two minutes. I’ll wait.',
    'Written down. My tea is still hot. Start before it isn’t.',
    'I have seen this one before, on other desks. It never grew smaller.',
    'Good. Now it has a place. Sit.',
  ],
};

const vi: ChalkLines = {
  kinds: [
    {
      words: ['email', 'mail', 'thư', 'trả lời', 'nhắn', 'tin nhắn', 'inbox'],
      lines: [
        'Một cái email. Ba câu. Thầy chấm bài văn còn dài hơn.',
        'Hộp thư chờ rồi. Ly trà của thầy cũng chờ.',
      ],
    },
    {
      words: ['gọi', 'điện thoại', 'phone'],
      lines: [
        'Gọi điện mất bốn phút. Ngồi sợ thì mất lâu hơn nhiều.',
        'Bấm số trước. Tập nói sau.',
      ],
    },
    {
      words: ['dọn', 'giặt', 'rửa', 'lau', 'quét', 'chén', 'bát', 'phòng'],
      lines: [
        'Chén bát không tự rửa từ năm 1994 rồi. Thầy kiểm tra rồi.',
        'Một góc thôi. Rồi tới góc kế.',
      ],
    },
    {
      words: ['trả', 'hoá đơn', 'hóa đơn', 'thuế', 'tiền nhà', 'đóng tiền', 'giấy tờ', 'đơn'],
      lines: [
        'Giấy tờ. Để trên bảng thì nó không ngắn đi.',
        'Một tờ đơn. Tên, ngày, chữ ký. Thầy cầm bút giùm cho.',
      ],
    },
    {
      words: ['viết', 'bài luận', 'báo cáo', 'luận văn', 'tiểu luận', 'bản nháp'],
      lines: [
        'Một câu dở. Rồi một câu khá hơn. Viết chỉ có vậy.',
        'Trang giấy trắng không phải lý do. Thầy chấm lý do.',
      ],
    },
    {
      words: ['học', 'đọc', 'ôn', 'bài tập', 'thi', 'luyện'],
      lines: [
        'Mở sách ra. Trang một. Thầy chờ.',
        'Ba mươi hai năm chấm bài tập. Bài này làm trước.',
      ],
    },
    {
      words: ['tập', 'gym', 'chạy', 'đi bộ', 'thể dục', 'yoga'],
      lines: [
        'Mang giày trước. Phần còn lại đi theo đôi giày.',
        'Mười phút thôi. Ngày thầy nghỉ hưu còn xa hơn.',
      ],
    },
    {
      words: ['đặt lịch', 'hẹn', 'nha sĩ', 'cắt tóc', 'gia hạn', 'hộ chiếu', 'khám'],
      lines: [
        'Đặt lịch mất hai phút. Thầy bấm giờ rồi.',
        'Có một cái form và một cái nút. Bấm cái nút.',
      ],
    },
  ],
  general: [
    'Lên bàn rồi. Hai phút. Thầy chờ.',
    'Thầy ghi rồi. Trà còn nóng. Bắt đầu trước khi nó nguội.',
    'Việc này thầy gặp trên bàn khác rồi. Để lâu nó không nhỏ đi đâu.',
    'Được. Giờ nó có chỗ rồi. Ngồi.',
  ],
};

export const chalkLines: Readonly<Record<Language, ChalkLines>> = { en, vi };
