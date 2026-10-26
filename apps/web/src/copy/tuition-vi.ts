import type { Loosen } from './en';
import type { tuitionEn } from './tuition-en';

/** Trang học phí bằng tiếng Việt. */
export const tuitionVi = {
  title: 'Học phí · Lớp Thầy Phú',
  description:
    'Thứ gì luôn miễn phí, học phí mở thêm gì, hai gói, tuần học thử, học bổng và cách huỷ.',
  eyebrow: 'Đóng học phí',
  headline: 'Học phí.',
  lede: 'Học thì miễn phí. Học phí mở thêm vài thứ, và lo tiền trà cho cả lớp. Những gì ảnh hưởng tới lời phê, tấm bảng, ngòi nổ, cái bàn của bạn hay những chuyện bất ngờ thì không bao giờ được đem bán.',
  freeTitle: 'Luôn miễn phí',
  free: [
    'Nói việc, bằng giọng nói hoặc gõ',
    'Cái bàn, tấm bảng và mọi tiết học',
    'Ngòi nổ và tiếng trống',
    'Lời phê và mọi dáng điệu của thầy',
    'Những chuyện bất ngờ và các hình khắc trên bàn',
    'Sổ đầu bài',
    'Widget nhỏ, Live Activity và Dynamic Island',
    'Chia sẻ',
    'Mọi thứ cho những ngày nặng lòng, và các đường dây hỗ trợ',
  ],
  paidTitle: 'Học phí mở thêm',
  paid: [
    'Thời khoá biểu: lịch của bạn thành các tiết trong ngày, và mỗi tiết trống thầy chọn sẵn một việc',
    'Widget lớn và StandBy',
    'Học bạ: sổ đầu bài in thành học bạ mỗi học kỳ, không đếm, không cộng điểm',
    'Và khi ra mắt: giọng nói thật của thầy, chụp ảnh danh sách thành việc, và Apple Watch',
  ],
  plansTitle: 'Hai gói',
  plans: [
    { name: 'Một năm học', price: '499.000đ', per: 'một năm', note: 'Được chọn sẵn' },
    { name: 'Một tháng', price: '79.000đ', per: 'một tháng', note: '' },
  ],
  plansNote:
    'Giá bằng đồng Việt Nam. Apple hiện đúng giá theo nước của bạn, kèm thuế nếu có, trước khi bạn mua.',
  trialTitle: 'Tuần học thử',
  trial: [
    'Gói nào cũng bắt đầu bằng một tuần dùng thử miễn phí của Apple. Apple cần một phương thức thanh toán cho tuần này.',
    'Trước khi bạn bấm nút, biên lai ghi rõ ba ngày: hôm nay, ngày thầy nhắc, và ngày trừ tiền lần đầu.',
    'Thầy gửi một lời nhắn hai ngày trước lần trừ tiền đầu tiên. Những lần sau cũng vậy, trước mỗi lần trừ tiền đều có lời nhắn.',
    'Huỷ bất cứ lúc nào trong tuần đó thì bạn không mất đồng nào.',
  ],
  receipt: {
    title: 'Biên lai',
    today: 'Hôm nay',
    todayNote: 'Bắt đầu học thử',
    reminder: 'Ngày 5',
    reminderNote: 'Thầy nhắc',
    charge: 'Ngày 7',
    chargeNote: 'Trừ tiền lần đầu',
    ask: 'Chưa đóng được?',
  },
  scholarshipTitle: 'Học bổng',
  scholarship:
    'Dưới mỗi biên lai đều có dòng “Chưa đóng được?”. Chạm một lần, ghi vài chữ nếu muốn, và bạn được miễn học phí một năm học. Không cần giấy tờ, không hỏi han. Cần thì xin thêm lần nữa.',
  backTitle: 'Quay lại học',
  back: 'Nếu học phí của bạn đã hết hạn, Apple có thể tặng bạn một tháng miễn phí, một lần. Thầy không bao giờ nhắc bạn đã đi bao lâu.',
  rulesTitle: 'Nội quy',
  rules: [
    'Không có màn hình thu tiền ở lần mở app đầu tiên, trên bàn, trong tiết học hay lúc xong việc.',
    'Tính năng trả phí chỉ là những nút khoá nằm yên chỗ của nó.',
    'Lời mời đóng học phí đầu tiên đến sau lần xong việc thứ ba, ghim lên bảng vào giờ ra chơi. Không bao giờ vào ngày có chuyện nặng lòng. Bỏ qua cũng không sao.',
  ],
  cancelTitle: 'Huỷ, hoàn tiền, khôi phục',
  cancel: [
    {
      q: 'Huỷ',
      a: 'Học phí là gói đăng ký qua Apple, tự gia hạn cho tới khi bạn huỷ. Trên iPhone: Cài đặt, tên của bạn, Đăng ký, Lớp Thầy Phú, Huỷ đăng ký. Hãy huỷ ít nhất một ngày trước khi gia hạn. Bạn vẫn dùng được tới hết kỳ đã trả.',
    },
    {
      q: 'Hoàn tiền',
      a: 'Apple lo mọi khoản thanh toán và hoàn tiền. Yêu cầu tại reportaproblem.apple.com, hoặc trong phần cài đặt của app, chỉ cần một chạm. Chúng tôi không tự hoàn tiền được.',
    },
    {
      q: 'Khôi phục',
      a: 'Đổi điện thoại mới? Trong cài đặt của app, chạm Khôi phục giao dịch khi đang đăng nhập cùng Tài khoản Apple.',
    },
  ],
  refundLink: 'reportaproblem.apple.com',
} as const satisfies Loosen<typeof tuitionEn>;
