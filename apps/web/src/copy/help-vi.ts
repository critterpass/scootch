import type { Loosen } from './en';
import type { helpEn } from './help-en';

/** Hỗ trợ và đường dây hỗ trợ bằng tiếng Việt. Trang đường dây hỗ trợ không bao giờ đùa. */
export const helpVi = {
  support: {
    title: 'Hỗ trợ · Lớp Thầy Phú',
    description:
      'Giải đáp về Lớp Thầy Phú: khôi phục giao dịch, huỷ, hoàn tiền, học bổng, dữ liệu và ngôn ngữ.',
    eyebrow: 'Hỗ trợ',
    headline: 'Hỏi gì, đáp nấy.',
    lede: 'Vẫn chưa ổn? Viết tới support@phusclass.com. Mỗi thư đều có người thật đọc.',
    email: 'support@phusclass.com',
    writeTo: 'Viết cho chúng tôi',
    notOutYet: 'Lớp Thầy Phú chưa ra mắt. Các câu trả lời dưới đây nói về app như ngày đầu ra mắt.',
    questions: [
      {
        q: 'Khôi phục giao dịch thế nào?',
        a: 'Trong cài đặt của app, chạm Khôi phục giao dịch khi đang đăng nhập đúng Tài khoản Apple đã trả tiền. Đổi điện thoại mới cũng làm y như vậy.',
      },
      {
        q: 'Huỷ học phí thế nào?',
        a: 'Trên iPhone: Cài đặt, tên của bạn, Đăng ký, Lớp Thầy Phú, Huỷ đăng ký. Hãy huỷ ít nhất một ngày trước khi gia hạn. Bạn vẫn dùng được tới hết kỳ đã trả.',
      },
      {
        q: 'Có được hoàn tiền không?',
        a: 'Apple nhận mọi khoản thanh toán nên Apple lo hoàn tiền: tại reportaproblem.apple.com, hoặc trong cài đặt của app, chỉ một chạm. Chúng tôi không tự hoàn tiền được.',
      },
      {
        q: 'Học bổng là gì?',
        a: 'Dưới mỗi biên lai trong app có dòng “Chưa đóng được?”. Chạm một lần, ghi vài chữ nếu muốn, là bạn được miễn học phí một năm học. Không cần giấy tờ, không hỏi han, cần thì xin thêm lần nữa.',
      },
      {
        q: 'Xoá dữ liệu thế nào?',
        a: 'Trong cài đặt của app: Xoá mọi thứ. Dữ liệu biến mất khỏi điện thoại, còn trên máy chủ thì hồ sơ thiết bị, các mã thông báo và bản sao lưu bị xoá ngay. Xoá dữ liệu không huỷ học phí; việc đó nằm trong cài đặt Apple.',
      },
      {
        q: 'Xuất dữ liệu được không?',
        a: 'Được. Trong cài đặt của app, mục Xuất dữ liệu cho bạn một tệp gồm các việc và sổ đầu bài.',
      },
      {
        q: 'Đổi ngôn ngữ thế nào?',
        a: 'Lớp Thầy Phú nói tiếng Việt hoặc tiếng Anh, mỗi lúc một thứ tiếng, theo ngôn ngữ của điện thoại. Muốn đổi riêng app này: Cài đặt iPhone, Ứng dụng, Lớp Thầy Phú, Ngôn ngữ.',
      },
      {
        q: 'Tắt lời nhắn của thầy thế nào?',
        a: 'Tắt trong cài đặt của app, hoặc trong Cài đặt iPhone, Thông báo. Ngày nào lời nhắn bị bỏ qua thì thầy tự im, và thầy tôn trọng chế độ Ngủ và Tập trung.',
      },
      {
        q: 'Mình đang có chuyện nặng lòng.',
        a: 'Khi đó thầy thôi diễn: không đùa, không chấm điểm, không thúc ép. Và nếu bạn đang thật sự khó khăn, có những người thật có thể giúp. Trang đường dây hỗ trợ có các số miễn phí, bảo mật theo từng nước.',
      },
    ],
    helplinesLink: 'Tìm đường dây hỗ trợ',
  },
  helplines: {
    title: 'Đường dây hỗ trợ · Lớp Thầy Phú',
    description: 'Các đường dây hỗ trợ miễn phí, bảo mật, theo từng nước.',
    headline: 'Nói chuyện với ai đó, ngay bây giờ.',
    intro:
      'Các đường dây này miễn phí, bảo mật và có người thật trả lời. Nếu bạn đang gặp nguy hiểm, hãy gọi ngay số cấp cứu nơi bạn sống.',
    emergency: 'Cấp cứu',
    anywhere: 'Nơi khác',
    footnote: 'Trang này không theo dõi bạn.',
  },
} as const satisfies Loosen<typeof helpEn>;
