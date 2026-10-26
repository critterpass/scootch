import type { Loosen } from './en';
import type { legalEn } from './legal-en';

/**
 * Quyền riêng tư và điều khoản bằng tiếng Việt: nói thẳng, không đùa. Nội dung phải khớp với những
 * gì mã nguồn thật sự làm, như bản tiếng Anh.
 */
export const legalVi = {
  privacy: {
    title: 'Quyền riêng tư · Lớp Thầy Phú',
    description:
      'Lớp Thầy Phú giữ gì, gửi đi đâu, giữ bao lâu. Giọng nói không bao giờ rời điện thoại. Không quảng cáo, không theo dõi, không bán dữ liệu.',
    headline: 'Quyền riêng tư, nói thẳng.',
    lede: 'Lớp Thầy Phú giữ càng ít càng tốt, và phần lớn nằm trên điện thoại của bạn. Không tài khoản, không quảng cáo, không theo dõi, không bán gì cả. Những gì bạn nói không bao giờ được dùng để huấn luyện mô hình AI.',
    updated: 'Cập nhật ngày 27 tháng 10 năm 2026.',
    tableTitle: 'Tóm tắt',
    columns: ['Dữ liệu', 'Đi đâu', 'Giữ bao lâu'],
    rows: [
      [
        'Giọng nói',
        'Được nhận dạng giọng nói của Apple chuyển thành chữ ngay trên điện thoại. Âm thanh không rời máy',
        'Không giữ lại',
      ],
      ['Việc, tấm bảng và sổ đầu bài', 'Điện thoại của bạn', 'Tới khi bạn xoá'],
      [
        'Bản sao lưu, nếu bật',
        'Một bản chụp dữ liệu của app trên máy chủ của chúng tôi, dưới một mã ẩn danh',
        'Tới khi bản sau thay thế, hoặc bạn xoá',
      ],
      [
        'Chữ được kiểm tra chuyện nặng lòng',
        'Máy chủ của chúng tôi, rồi tới TypeSafe',
        'Không lưu, không ghi nhật ký',
      ],
      [
        'Chữ để viết câu mới',
        'Máy chủ của chúng tôi, rồi tới DeepSeek: chỉ chữ của việc đó',
        'Chúng tôi không lưu',
      ],
      ['Lịch của bạn', 'Chỉ đọc trên điện thoại', 'Không bao giờ rời điện thoại'],
      [
        'Giao dịch',
        'Apple và RevenueCat, với một mã ẩn danh',
        'Trong thời gian bạn đóng học phí, và theo yêu cầu lưu trữ của Apple',
      ],
      [
        'Lời nhắn của thầy',
        'Một mã thông báo của Apple trên máy chủ của chúng tôi',
        'Tới khi bạn tắt lời nhắn hoặc xoá mọi thứ',
      ],
      ['Báo cáo sự cố', 'Sentry, đặt tại EU', 'Nhiều nhất 90 ngày'],
    ],
    sections: [
      {
        title: 'Chúng tôi là ai',
        body: [
          'Lớp Thầy Phú do Odd Eggs Studio làm ra, và Odd Eggs Studio chịu trách nhiệm về những dữ liệu nói trong trang này. Có gì cần hỏi, bạn viết tới privacy@phusclass.com.',
        ],
      },
      {
        title: 'Khi bạn nói',
        body: [
          'Khi bạn giữ nút để nói, tính năng nhận dạng giọng nói của Apple chuyển lời bạn thành chữ ngay trên điện thoại, ở chế độ chỉ chạy trên máy. Âm thanh không bao giờ rời điện thoại và không bao giờ được giữ lại, kể cả bởi chúng tôi hay bởi app. Bạn luôn có thể gõ thay vì nói.',
        ],
      },
      {
        title: 'Việc của bạn',
        body: [
          'Mọi điều bạn nói hay gõ, tấm bảng, sổ đầu bài và cái bàn của bạn đều nằm trong cơ sở dữ liệu trên điện thoại. Không có tài khoản, không cần đăng nhập.',
          'Nếu bật sao lưu, app gửi một bản chụp dữ liệu đó lên máy chủ để bạn lấy lại được khi đổi điện thoại. Bản chụp được lưu dưới một mã sao lưu ẩn danh giữ trong iCloud của bạn; máy chủ chỉ giữ dấu vân tay (mã băm) của mã đó, không giữ chính mã, và không có gì cho biết điện thoại nào đã gửi. Mỗi lần sao lưu thay bản trước. Mỗi bản tối đa 512 KB. Xoá mọi thứ là bản sao lưu cũng mất.',
        ],
      },
      {
        title: 'Kiểm tra chuyện nặng lòng',
        body: [
          'Trước khi Thầy Phú nói câu gì châm chọc về một việc, chữ của việc đó được kiểm tra xem có liên quan tới khủng hoảng hay chuyện nặng lòng không, để thầy biết lúc nào phải thôi diễn. Điện thoại kiểm tra trước, không cần mạng. Khi có mạng, chữ đó được gửi tới máy chủ của chúng tôi rồi tới TypeSafe, một dịch vụ đánh giá nội dung. Nếu TypeSafe không trả lời, DeepSeek trả lời thay. Nếu tiếng Việt được gõ không dấu, DeepSeek có thể thêm dấu trước để đọc cho đúng.',
          'Phần chữ này không được lưu, không được ghi nhật ký trên máy chủ của chúng tôi, và không bao giờ được dùng để huấn luyện mô hình AI.',
        ],
      },
      {
        title: 'Những câu mới của thầy',
        body: [
          'Phần lớn câu của thầy đã được viết sẵn và nằm ngay trong app. Khi có mạng và gặp một việc thầy chưa có câu hợp, máy chủ của chúng tôi nhờ DeepSeek viết một câu. Chỉ chữ của việc đó được gửi đi, không kèm tên, mã thiết bị hay bất cứ thông tin nào về bạn. Chúng tôi không lưu lại.',
        ],
      },
      {
        title: 'Lịch của bạn',
        body: [
          'Nếu bạn mở thời khoá biểu và cho phép, app đọc các sự kiện trong lịch ngay trên điện thoại để xếp ngày của bạn. Chúng không bao giờ rời điện thoại, và app không bao giờ sửa lịch của bạn.',
        ],
      },
      {
        title: 'Thiết bị của bạn và máy chủ',
        body: [
          'Lần đầu app liên lạc với máy chủ, nó tạo một mã thiết bị ngẫu nhiên. Máy chủ chỉ giữ mã băm của mã đó, ngôn ngữ của app, và thời điểm thấy lần đầu, lần cuối. Mã này không gắn với tên, email hay Tài khoản Apple của bạn.',
          'Với mỗi lần gọi tới mô hình AI, chúng tôi ghi lại tuyến gọi, tên mô hình và số token đã dùng, không bao giờ ghi chữ, để biết dịch vụ tốn bao nhiêu. Khi bạn xoá mọi thứ, các dòng ghi đó bị cắt khỏi thiết bị của bạn.',
        ],
      },
      {
        title: 'Giao dịch',
        body: [
          'Apple nhận mọi khoản thanh toán; chúng tôi không bao giờ thấy thẻ của bạn. RevenueCat theo dõi việc bạn có đang đóng học phí không, dưới một mã ẩn danh mà máy chủ tạo từ mã thiết bị. Máy chủ giữ thông tin học phí có đang hiệu lực không, gói nào, và khi nào hết hạn.',
        ],
      },
      {
        title: 'Lời nhắn của thầy',
        body: [
          'Nếu bạn cho thầy gửi lời nhắn, Apple cấp cho app một mã thông báo, và máy chủ giữ mã đó cùng tên app để lời nhắn tới được bạn. Live Activity cũng có mã riêng, giữ cùng cách trong lúc nó chạy. Tắt lời nhắn hoặc xoá mọi thứ là các mã này mất.',
        ],
      },
      {
        title: 'Ảnh',
        body: [
          'App chỉ thêm vào thư viện ảnh những tấm thẻ bạn chọn lưu. App không bao giờ xem các ảnh khác.',
        ],
      },
      {
        title: 'Báo cáo sự cố',
        body: [
          'Khi app gặp lỗi, một báo cáo được gửi tới Sentry, lưu tại EU: lỗi gì, ở chỗ nào trong app, đời iPhone và phiên bản iOS. Báo cáo được thiết lập để không có tên bạn, việc của bạn hay bất cứ gì bạn gõ. Báo cáo bị xoá sau nhiều nhất 90 ngày.',
        ],
      },
      {
        title: 'Những điều chúng tôi không làm',
        body: [
          'Không quảng cáo. Không theo dõi bạn qua các app hay trang web khác. Không bán hay chia sẻ dữ liệu cho tiếp thị. Những gì bạn nói không được dùng để huấn luyện mô hình AI. Các dịch vụ kể trên chỉ được dùng để vận hành Lớp Thầy Phú.',
        ],
      },
      {
        title: 'Xuất và xoá dữ liệu',
        body: [
          'Trong phần cài đặt của app, bạn có thể xuất mọi thứ ra một tệp, và xoá mọi thứ. Xoá là dữ liệu biến mất khỏi điện thoại, còn trên máy chủ thì hồ sơ thiết bị, các mã thông báo và bản sao lưu bị xoá ngay. Báo cáo sự cố tự hết hạn trong vòng 90 ngày. Xoá dữ liệu không huỷ học phí: việc đó nằm trong cài đặt Apple.',
          'Bạn cũng có thể viết tới privacy@phusclass.com để hỏi chúng tôi đang giữ gì, để sửa hoặc xoá. Vì không có tài khoản, có thể chúng tôi cần bạn giúp để tìm đúng phần của bạn.',
        ],
      },
      {
        title: 'Trang web này',
        body: [
          'phusclass.com không đặt cookie và không chạy công cụ phân tích nào. Tấm bảng ở trang chủ chạy hoàn toàn trong trình duyệt: những gì bạn gõ ở đó không được gửi đi đâu. Cloudflare, nơi lưu trữ trang, xử lý các yêu cầu để hiển thị trang.',
        ],
      },
      {
        title: 'Trẻ em',
        body: [
          'Lớp Thầy Phú không dành cho trẻ dưới 13 tuổi, và chúng tôi không cố ý thu thập dữ liệu của trẻ.',
        ],
      },
      {
        title: 'Thay đổi',
        body: [
          'Nếu chính sách này thay đổi, bản mới sẽ được đăng ở đây kèm ngày mới. Nếu thay đổi ảnh hưởng tới cách dùng dữ liệu của bạn, app sẽ báo trước.',
        ],
      },
    ],
    contact: 'Thắc mắc: privacy@phusclass.com',
  },
  terms: {
    title: 'Điều khoản · Lớp Thầy Phú',
    description:
      'Điều khoản dùng Lớp Thầy Phú và đóng học phí, nói dễ hiểu: gói đăng ký, tuần học thử, huỷ và hoàn tiền.',
    headline: 'Điều khoản sử dụng.',
    lede: 'Đây là thoả thuận giữa bạn và Odd Eggs Studio, nơi làm ra Lớp Thầy Phú, viết cho dễ hiểu. Khi dùng app hay trang web này, bạn đồng ý với các điều khoản dưới đây.',
    updated: 'Cập nhật ngày 27 tháng 10 năm 2026.',
    crisisTitle: 'Khi khủng hoảng',
    crisis:
      'Lớp Thầy Phú không phải dịch vụ cấp cứu hay hỗ trợ khủng hoảng. Nếu bạn có thể làm hại bản thân hoặc người khác, hãy gọi ngay số cấp cứu nơi bạn sống, hoặc nói chuyện với một đường dây hỗ trợ miễn phí, bảo mật.',
    crisisLink: 'Tìm đường dây hỗ trợ',
    sections: [
      {
        title: 'Chúng tôi là ai',
        body: [
          'Lớp Thầy Phú do Odd Eggs Studio (“chúng tôi”) phát hành. Có gì cần hỏi, bạn viết tới hello@phusclass.com.',
        ],
      },
      {
        title: 'Ai được dùng',
        body: ['Bạn cần từ 13 tuổi trở lên để dùng Lớp Thầy Phú.'],
      },
      {
        title: 'Công cụ hỗ trợ, không phải chăm sóc y tế',
        body: [
          'Lớp Thầy Phú là công cụ hỗ trợ để bắt đầu làm việc. App không chẩn đoán, điều trị, chữa hay phòng ngừa ADHD hay bất kỳ bệnh nào, và không thay thế cho chăm sóc chuyên môn. Về sức khoẻ, hãy hỏi người có chuyên môn.',
          'Thầy Phú là một nhân vật. Các câu của thầy được viết để đùa về việc trước mặt bạn; một số câu do mô hình AI viết và có thể sai hoặc lạ. Không câu nào là lời khuyên.',
        ],
      },
      {
        title: 'Những gì của bạn',
        body: [
          'Việc của bạn và mọi thứ bạn viết là của bạn. Bạn cho phép chúng tôi xử lý chúng ở mức cần để app chạy: ví dụ kiểm tra một việc có liên quan chuyện nặng lòng không, hay viết một câu về nó, như trang quyền riêng tư đã giải thích.',
        ],
      },
      {
        title: 'Sử dụng đúng mực',
        body: [
          'Dùng Lớp Thầy Phú cho chính bạn, và đúng pháp luật. Đừng tìm cách phá, làm quá tải hay lách các dịch vụ và các bước kiểm tra an toàn của app, đừng dùng app để tạo nội dung độc hại hay xúc phạm, và đừng sao chép hay bán lại app. Chúng tôi có thể tạm dừng truy cập từ thiết bị lạm dụng dịch vụ.',
        ],
      },
      {
        title: 'Học phí: gói đăng ký',
        body: [
          'Học phí là gói đăng ký tự gia hạn bán qua Apple, theo năm hoặc theo tháng. Tiền được trừ vào Tài khoản Apple khi bạn xác nhận, hoặc khi hết tuần học thử. Gói tự gia hạn cùng thời hạn và cùng giá, trừ khi bạn huỷ ít nhất 24 giờ trước khi kỳ hiện tại kết thúc.',
          'Tuần học thử: mỗi gói có thể bắt đầu bằng một tuần miễn phí. Apple cần một phương thức thanh toán cho tuần này. Nếu bạn không huỷ ít nhất 24 giờ trước khi tuần đó kết thúc, gói bạn chọn bắt đầu và bị trừ tiền. Thầy gửi lời nhắc hai ngày trước lần trừ tiền đầu tiên.',
          'Huỷ trong Cài đặt của iPhone: tên của bạn, Đăng ký, Lớp Thầy Phú. Huỷ là dừng lần gia hạn tiếp theo; bạn vẫn có học phí tới hết kỳ đã trả.',
          'Việc hoàn tiền do Apple xử lý theo quy định của Apple, tại reportaproblem.apple.com hoặc trong phần cài đặt của app. Chúng tôi không tự hoàn tiền được.',
          'Nếu giá thay đổi, Apple báo cho bạn trước khi áp dụng, và bạn có thể huỷ. Học bổng là một năm học miễn học phí mà chúng tôi cấp khi bạn xin, không cần giấy tờ.',
        ],
      },
      {
        title: 'Apple',
        body: [
          'App được cấp phép cho bạn theo Thoả thuận cấp phép người dùng cuối tiêu chuẩn của Apple, cùng với các điều khoản này. Apple không chịu trách nhiệm về app hay việc hỗ trợ app.',
        ],
      },
      {
        title: 'Dịch vụ',
        body: [
          'Nghe việc và chạy tiết học hoạt động trên điện thoại, không cần mạng. Các phần cần mạng, như câu mới và sao lưu, đôi lúc có thể không dùng được hoặc thay đổi. Chúng tôi có thể cập nhật hay ngừng một tính năng, và sẽ nói rõ với bạn.',
        ],
      },
      {
        title: 'Giới hạn trách nhiệm',
        body: [
          'Lớp Thầy Phú được cung cấp nguyên trạng. Trong phạm vi pháp luật cho phép, chúng tôi không chịu trách nhiệm về thiệt hại gián tiếp hay hệ quả, và tổng trách nhiệm của chúng tôi với bạn không vượt quá số tiền bạn đã trả cho chúng tôi trong 12 tháng trước khi khiếu nại. Không điều nào ở đây hạn chế những quyền mà luật bảo vệ người tiêu dùng nơi bạn sống không cho phép hạn chế.',
        ],
      },
      {
        title: 'Ngừng dùng',
        body: [
          'Bạn có thể ngừng dùng Lớp Thầy Phú bất cứ lúc nào và xoá mọi thứ trong phần cài đặt của app. Xoá dữ liệu không huỷ học phí; hãy huỷ trong cài đặt Apple.',
        ],
      },
      {
        title: 'Thay đổi điều khoản',
        body: [
          'Nếu các điều khoản này thay đổi, bản mới sẽ được đăng ở đây kèm ngày mới. Nếu thay đổi quan trọng, app sẽ báo trước khi áp dụng.',
        ],
      },
    ],
    contact: 'Thắc mắc: hello@phusclass.com',
  },
} as const satisfies Loosen<typeof legalEn>;
