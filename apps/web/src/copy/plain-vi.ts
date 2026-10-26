import type { Loosen } from './en';
import type { plainEn } from './plain-en';

/** The plain pages in Vietnamese: thẳng thắn, và không đùa về chuyện nghiêm túc. */
export const plainVi = {
  privacy: {
    title: 'Quyền riêng tư, nói thẳng · Lớp Thầy Phú',
    description:
      'Lớp Thầy Phú giữ gì, giữ bao lâu, và điều gì không bao giờ dùng để huấn luyện AI.',
    headline: 'Quyền riêng tư, nói thẳng.',
    intro:
      'Cái gì được giữ lại và giữ bao lâu. Những gì bạn nói hay gõ không bao giờ được dùng để huấn luyện mô hình AI.',
    columns: ['Dữ liệu', 'Giữ bao lâu'],
    rows: [
      [
        'Âm thanh khi bạn nói',
        'Lớp Thầy Phú không bao giờ giữ. Khi có mạng, âm thanh được gửi tới ElevenLabs để chuyển thành chữ; khi không có mạng, điện thoại tự làm',
      ],
      [
        'Bản chữ của lời bạn nói',
        'Tới khi chọn xong một việc (hoặc bảy ngày nếu bạn bật tùy chọn đó)',
      ],
      ['Việc bạn gõ', 'Tới khi bạn xóa'],
      [
        'Ảnh chụp bằng máy ảnh',
        'Không bao giờ rời khỏi điện thoại. Đọc ngay trên máy và xóa khi đóng máy ảnh; tấm ảnh mở đầu một phiên được giữ cho tấm ảnh sau, nhiều nhất một ngày',
      ],
      [
        'Phần chữ đọc từ ảnh Giấy tờ hoặc Màn hình',
        'Chỉ gửi đi sau khi bạn cho phép, để đọc. Không lưu và không ghi nhật ký',
      ],
      ['Thứ bạn gõ vào lò ấp quái trên web', '24 giờ, trừ khi bạn chia sẻ tấm thẻ'],
      ['Thẻ và bản nhạc đã chia sẻ', 'Tới khi bạn gỡ chia sẻ'],
      ['Nhãn ở bàn', 'Trong lúc bạn còn ngồi'],
      [
        'Việc bạn đang trong một phiên',
        'Khi một phiên bắt đầu và kết thúc, điện thoại chỉ báo cho chúng tôi rằng thiết bị này đang trong phiên: không có việc, tên hay nhãn nào. Chúng tôi giữ một dòng cho thiết bị kèm giờ bắt đầu. Dòng đó được gỡ khi phiên kết thúc, quên sau ba tiếng, và bị xóa cùng Xóa mọi thứ. Tắt bằng Những người đang săn trong Cài đặt',
      ],
      ['Số liệu phân tích', 'Chỉ là số đếm, không có mã quảng cáo, 13 tháng'],
      [
        'Báo cáo sự cố',
        'Chỗ bị hỏng và nó nằm ở đâu trong ứng dụng, kèm đời iPhone và phiên bản iOS. Gửi tới Sentry, nhiều nhất 90 ngày',
      ],
      ['Xóa mọi thứ', 'Biến mất khỏi điện thoại và máy chủ trong vòng 30 ngày'],
    ],
    notes: [
      'Trên trang web này: lò ấp quái không lưu thứ gì bạn gõ. Nếu bạn chia sẻ tấm thẻ, con quái được giữ lại (tên, câu ghi trên thẻ, và thứ bạn gõ chỉ khi bạn để bật “Hiện câu tui đã gõ”) cho tới khi bạn gỡ chia sẻ, từ chính trình duyệt bạn đã chia sẻ.',
      'Nếu bạn để lại email để biết ngày ra mắt, email được giữ cùng con quái nó sẽ mang theo, và chỉ dùng cho đúng một email đó.',
    ],
    exportTitle: 'Xuất dữ liệu',
    exportBody:
      'Trong app: Cài đặt › Quyền riêng tư và dữ liệu › Xuất dữ liệu của tôi. Bạn nhận một tệp gồm việc, quái và bản nhạc của bạn.',
    deleteTitle: 'Xóa',
    deleteBody:
      'Trong app: Cài đặt › Quyền riêng tư và dữ liệu › Xóa mọi thứ. Mọi thứ biến mất khỏi điện thoại và máy chủ của chúng tôi trong vòng 30 ngày. Xóa dữ liệu không hủy Plus; việc đó nằm trong cài đặt Apple.',
    questions: 'Thắc mắc: privacy@phusclass.com.',
    updated: 'Cập nhật lần cuối ngày 9 tháng 10 năm 2026.',
  },
  terms: {
    title: 'Điều khoản, nói dễ hiểu · Lớp Thầy Phú',
    description: 'Dùng Lớp Thầy Phú nghĩa là gì, không vòng vo pháp lý.',
    headline: 'Điều khoản, nói dễ hiểu.',
    intro:
      'Đây là bản nói thẳng, và chúng tôi nói sao làm vậy. Bản pháp lý đầy đủ sẽ được dẫn ở đây trước khi app mở bán.',
    sections: [
      {
        title: 'Bản ngắn gọn',
        body: 'Dùng Lớp Thầy Phú để bắt đầu việc. Đừng dùng nó để làm hại ai. Chúng tôi sẽ nói thẳng với bạn về tiền và dữ liệu.',
      },
      {
        title: 'Đồ của bạn',
        body: 'Việc, quái và bản nhạc của bạn là của bạn. Bạn cho phép chúng tôi lưu chúng để app chạy được, và hiển thị những gì bạn chọn chia sẻ.',
      },
      {
        title: 'Thứ công khai',
        body: 'Nếu bạn chia sẻ một đường dẫn, nó công khai cho tới khi bạn gỡ xuống. Đừng chia sẻ chuyện riêng tư của người khác.',
      },
      {
        title: 'Trả tiền',
        body: 'Plus do Apple bán. Apple lo việc tính tiền, hoàn tiền và hủy. Chúng tôi nhắc bạn trước mỗi lần trừ tiền.',
      },
      {
        title: 'Không phải lời khuyên y tế',
        body: 'Lớp Thầy Phú là công cụ hỗ trợ để bắt đầu việc. Lớp Thầy Phú không chẩn đoán, điều trị hay chữa ADHD hoặc bất cứ điều gì khác. Nếu bạn cần được chăm sóc, hãy tìm đến người có chuyên môn.',
      },
      {
        title: 'Kết thúc',
        body: 'Bạn có thể xóa mọi thứ bất cứ lúc nào. Chúng tôi có thể tạm khóa người lạm dụng bàn hoặc tính năng ám bạn bè.',
      },
    ],
  },
  support: {
    title: 'Câu hỏi, trả lời thẳng · Lớp Thầy Phú',
    description: 'Mười lăm câu hỏi về Lớp Thầy Phú, trả lời thẳng.',
    headline: 'Câu hỏi, trả lời thẳng.',
    intro:
      'Có mười lăm câu. Vẫn còn kẹt? Viết cho help@phusclass.com. Thư nào cũng có người thật đọc.',
    notOutYet: 'Lớp Thầy Phú chưa ra mắt. Các câu trả lời này mô tả app vào ngày đầu tiên của nó.',
    helplinesLink: 'Tìm đường dây hỗ trợ ở nước bạn',
    questions: [
      {
        q: 'Lớp Thầy Phú có miễn phí không?',
        a: 'Có. Trọn vòng một ngày, mỗi ngày tới mười việc, là miễn phí mãi mãi: cả ba kiểu tính cách, mọi con quái bạn bắt được, ngồi vào bàn của bạn bè, và bài hát mỗi tuần. Plus thêm vài món phụ. Không thứ gì bạn cần để bắt đầu nằm sau Plus.',
      },
      {
        q: 'Có cần tài khoản không?',
        a: 'Không. Lớp Thầy Phú chạy mà không cần đăng ký. Bạn chỉ đăng nhập khi ngồi vào bàn, và đó là Đăng nhập bằng Apple.',
      },
      {
        q: 'Lớp Thầy Phú có dành cho người ADHD không?',
        a: 'App được làm cho người có ADHD và cho ai hay trì hoãn. Nếu khó nhất là lúc bắt đầu thì app dành cho bạn. Đây là công cụ hỗ trợ, không phải phương pháp điều trị.',
      },
      {
        q: 'Nó có chẩn đoán hay điều trị gì không?',
        a: 'Không. Đây là công cụ hỗ trợ để bắt đầu việc. Nó không chẩn đoán, điều trị hay chữa bất cứ điều gì, và không thay thế cho việc chăm sóc y tế.',
      },
      {
        q: 'Những gì tôi nói sẽ đi đâu?',
        a: 'Giọng nói của bạn được ElevenLabs chuyển thành chữ khi có mạng, và ngay trên điện thoại khi không có. Lớp Thầy Phú không bao giờ giữ âm thanh. Phần chữ được giữ tới khi chọn xong một việc của bạn. Không gì trong đó được dùng để huấn luyện mô hình AI. Trang quyền riêng tư có đủ cả bảng.',
      },
      {
        q: 'Sao mỗi lần chỉ một việc?',
        a: 'Vì bắt đầu được đã là thắng, còn một danh sách dài chính là thứ phần lớn chúng ta đang né. Lớp Thầy Phú chọn một việc và cất phần còn lại vào ngăn kéo. Xong việc đó thì bạn chọn việc khác: mỗi ngày tới mười việc, miễn phí.',
      },
      {
        q: 'Nếu tôi không làm xong thì sao?',
        a: '“Chưa xong” là một kết quả bình thường, và Lớp Thầy Phú đưa bạn ba lựa chọn cho bước tiếp theo. Nó không bao giờ đếm ngày và không bao giờ nhắc tới khoảng trống.',
      },
      {
        q: 'Người lạ có thấy việc của tôi không?',
        a: 'Không. Bàn chỉ dành cho bạn bè bạn mời bằng đường dẫn, và ở bàn mọi người chỉ thấy một nhãn một hai chữ do Lớp Thầy Phú viết, không bao giờ là lời của bạn. Không gì công khai trừ khi bạn chia sẻ, và lần chia sẻ nào cũng ẩn được việc.',
      },
      {
        q: 'Tắt mấy câu đùa được không?',
        a: 'Bạn chọn một kiểu tính cách: Nhẹ nhàng, Láu cá hoặc Quậy tới bến, và Nhẹ nhàng là kiểu êm nhất. Không có công tắc nào gỡ hẳn tính cách của Lớp Thầy Phú. Với chuyện nặng nề, Lớp Thầy Phú tự ngừng đùa.',
      },
      {
        q: 'Hủy Plus thế nào?',
        a: 'Trong cài đặt Apple: tên bạn, rồi Đăng ký, rồi Lớp Thầy Phú. iPhone không có tạm dừng, chỉ có hủy. Bạn giữ mọi thứ đã bắt được.',
      },
      {
        q: 'Tôi có được hoàn tiền không?',
        a: 'Apple xử lý mọi việc hoàn tiền, tại reportaproblem.apple.com. Chúng tôi không tự hoàn được, vì Apple là bên thu tiền.',
      },
      {
        q: 'Có app Android không?',
        a: 'Chưa. Hiện Lớp Thầy Phú chỉ có trên iPhone. Android nằm trong kế hoạch, chưa có ngày. Bạn có thể để lại email ở trang Android, còn lò ấp quái trên trang này chạy được trên mọi điện thoại.',
      },
      {
        q: 'Không có mạng thì dùng được không?',
        a: 'Việc bắt đầu không bao giờ phụ thuộc máy chủ, nên một phiên làm việc chạy được khi không có kết nối. Lúc mất mạng, Lớp Thầy Phú ngồi cùng bạn bằng lời lẽ giản dị, và con quái của việc mới sẽ nở khi bạn có mạng lại.',
      },
      {
        q: 'Làm sao xóa mọi thứ?',
        a: 'Trong app: Cài đặt › Quyền riêng tư và dữ liệu › Xóa mọi thứ. Mọi thứ biến mất khỏi điện thoại và máy chủ của chúng tôi trong vòng 30 ngày. Việc này không hủy Plus; hủy Plus nằm trong cài đặt Apple.',
      },
      {
        q: 'Tôi đang rất khó khăn',
        a: 'Vậy thì lúc này Lớp Thầy Phú không phải là sự giúp đỡ phù hợp, mà là những con người thật. Trang đường dây hỗ trợ liệt kê các đường dây miễn phí, bảo mật theo từng nước. Nếu bạn đang gặp nguy hiểm ngay lúc này, hãy gọi số khẩn cấp nơi bạn ở.',
      },
    ],
  },
  helplines: {
    title: 'Đường dây hỗ trợ · Lớp Thầy Phú',
    description: 'Các đường dây hỗ trợ miễn phí, bảo mật theo từng nước.',
    headline: 'Hãy nói chuyện với ai đó ngay bây giờ.',
    intro:
      'Các đường dây này miễn phí, bảo mật và có người thật trực. Nếu bạn đang gặp nguy hiểm ngay lúc này, hãy gọi số khẩn cấp nơi bạn ở.',
    emergency: 'Cấp cứu',
    anywhere: 'Những nơi khác',
    footnote: 'Trang này không có Lớp Thầy Phú, không đùa, không theo dõi.',
  },
} as const satisfies Loosen<typeof plainEn>;
