import type { SiteCopy } from './en';
import { tuitionVi } from './tuition-vi';

/**
 * The website's words in Vietnamese, written as a Vietnamese site would say them. The site talks
 * to the reader as “bạn”; Thầy Phú talks to his student as “em”.
 */
export const vi = {
  brand: { name: 'Lớp Thầy Phú', short: 'Lớp Thầy Phú' },
  nav: {
    label: 'Chính',
    loop: 'Giờ học',
    tuition: 'Học phí',
    support: 'Hỗ trợ',
    menu: 'Menu',
    getTheApp: 'Tải app',
    skip: 'Tới thẳng nội dung',
    otherLanguage: 'English',
    otherLanguageLabel: 'Read this page in English',
  },
  badge: {
    alt: 'Tải trên App Store',
    comingSoon: 'Sắp có trên App Store',
  },
  home: {
    title: 'Lớp Thầy Phú: một việc trên bàn, và một thầy giáo ngồi chờ',
    description:
      'Một thầy giáo nghiêm, tròn trịa, mê trà, dành cho người ADHD và người hay trì hoãn. Kể hết ra. Thầy đặt một việc lên bàn và ngồi chờ.',
    hero: {
      eyebrow: 'Cho iPhone · cho người ADHD và người hay trì hoãn',
      title: 'Lớp Thầy Phú',
      line: 'Hai phút. Thầy chờ.',
      lede: 'Thầy Phú đứng lớp ba mươi hai năm, lý do gì cũng đã nghe qua. Bạn cứ kể hết những việc đang né. Thầy ghi tất cả lên bảng, đặt đúng một việc lên bàn, rồi ngồi chờ bạn bắt đầu.',
      boardDate: 'Thứ Hai',
      board: ['Email nha sĩ', 'Nhắn chủ nhà', 'Gia hạn hộ chiếu'],
      boardMore: '+ 4 việc nữa',
      art: 'Thầy Phú ngồi ở bàn giáo viên, nhấp trà, nhìn qua gọng kính, sau lưng là tấm bảng đen',
    },
    loop: {
      eyebrow: 'Một tiết học',
      title: 'Giờ học diễn ra thế này.',
      say: {
        title: 'Nói ra.',
        body: 'Giữ nút để nói, hoặc gõ. Nói lan man bao lâu cũng được: mỗi việc bay lên bảng thành một dòng phấn. Điện thoại tự nghe và chép, có mạng hay không cũng vậy.',
        said: '“trời ơi, cái email nha sĩ, rồi hộ chiếu, rồi còn hứa gọi chủ nhà nữa…”',
      },
      pick: {
        title: 'Thầy chọn.',
        body: 'Một việc được đặt lên bàn, kèm một câu giải thích. Việc hạn hôm nay lên trước, rồi tới việc đã nằm chờ lâu nhất.',
        task: 'Email nha sĩ',
        line: 'Nằm trên bảng chín ngày rồi. Làm cái này trước.',
      },
      fuse: {
        title: 'Ngòi nổ.',
        body: 'Bàn mở ra với một khoảng chờ ngắn. Ngòi cháy quanh nút Bắt đầu, việc càng nằm lâu thì thầy càng tròn. Bắt đầu là mọi thứ về lại từ đầu.',
        start: 'Bắt đầu',
        step: 'Mức {n}',
        stepsLabel: 'Mức sốt ruột của thầy, từ 0 tới 5',
        steps: [
          { pose: 'Ngẩng lên', line: 'Hai phút. Thầy chờ.' },
          { pose: 'Nhấp trà, nhìn qua gọng kính', line: 'Lúc em ngồi xuống, ly trà này còn nóng.' },
          { pose: 'Khoanh tay', line: 'Thầy với em đều biết chuyện này rồi sẽ ra sao.' },
          { pose: 'Gõ thước', line: 'Cộp. Cộp.' },
          { pose: 'Gọi đủ họ tên, mặt tròn và đỏ', line: 'TRẦN. MINH. ANH.' },
          { pose: 'Im lặng. Mắt kính loá trắng', line: '…' },
        ],
        hint: 'Cứ để thầy chờ, hoặc chạm vào từng mức.',
      },
      drum: {
        title: 'Tiếng trống.',
        body: 'Bấm bắt đầu là trống trường vang lên. Một tiết mười phút. Thầy đi tới đi lui trên bục, chấm bài, thỉnh thoảng nhìn thẳng vào bạn. Giơ tay lên nếu cần một bước nhỏ tiếp theo.',
        beat: 'Tùng! Tùng! Tùng!',
      },
      pen: {
        title: 'Bút đỏ.',
        body: 'Xong việc, một dấu tích đỏ tự vẽ ra. Lời phê của thầy tuỳ vào việc: có bắt đầu trước khi ngòi cháy hết không, có xin khất lần nào không, đã nằm chờ bao lâu. Chưa xong? Có điểm một phần, và ba cách đi tiếp.',
        paper: 'Email nha sĩ',
        waited: 'Chờ 9 ngày. Làm 11 phút.',
        ladder: ['Được.', 'Khá.', 'Tốt.'],
        ten: '10',
        tenNote: 'Điểm 10 khoanh đỏ rất hiếm. Không bán, không hẹn trước.',
      },
    },
    never: {
      eyebrow: 'Lớp học',
      title: 'Không hôm nào giống hôm nào.',
      lede: 'Cứ khoảng bốn buổi lại có một chuyện nhỏ xảy ra. Không ai giải thích.',
      happenings: [
        {
          art: 'cat',
          title: 'Con mèo đi ngang bàn thầy.',
          line: 'Không phải lúc này, Mèo.',
          after: '',
        },
        { art: 'plane', title: 'Một chiếc máy bay giấy bay vào.', line: 'Của ai đây?', after: '' },
        { art: 'candle', title: 'Mất điện.', line: 'Học tiếp.', after: 'Thầy thắp một cây nến.' },
        {
          art: 'icecream',
          title: 'Tiếng chuông xe kem ngoài cổng.',
          line: 'Hết tiết đã. Rồi tính.',
          after: '',
        },
        {
          art: 'butterfly',
          title: 'Một con bướm đậu lên bảng.',
          line: '',
          after: 'Thầy viết tránh nó ra.',
        },
        {
          art: 'papers',
          title: 'Kiểm tra miệng.',
          line: 'Bỏ giấy ra!',
          after: 'Hôm đó mỗi tiết mười lăm phút.',
        },
      ],
      seasonsTitle: 'Theo đúng lịch ngoài đời',
      seasons: [
        { art: 'bucket', title: 'Mùa mưa', body: 'Mưa hắt lên cửa sổ, cái xô hứng chỗ dột.' },
        { art: 'peach', title: 'Tết', body: 'Cành đào, và một cái bánh chưng trên bàn thầy.' },
        { art: 'lantern', title: 'Trung thu', body: 'Một cái đèn ông sao bên cửa sổ.' },
        {
          art: 'bouquet',
          title: '20/11',
          body: 'Ngày Nhà giáo. Hoa chất đầy bàn. Thầy lặng người.',
        },
        { art: 'cake', title: 'Sinh nhật thầy', body: 'Một cây nến. Thầy không nói với ai.' },
        { art: 'coffee', title: 'Ngày nắng gắt', body: 'Cà phê sữa đá thay cho trà.' },
      ],
      deskTitle: 'Cái bàn nhớ hết.',
      deskBody:
        'Mỗi việc làm xong khắc một hình nhỏ lên bàn của bạn: chữ cái đầu tên, ngôi sao, một ông Thầy Phú tí hon. Không vết nào mất đi.',
    },
    rules: {
      eyebrow: 'Nội quy',
      title: 'Những điều thầy không bao giờ làm.',
      struck: [
        'Chuỗi ngày',
        'Điểm thưởng, bảng xếp hạng',
        'Điểm danh',
        'Nhận xét về con người bạn',
      ],
      body: 'Thầy khắt khe với việc, không bao giờ với bạn. Thầy chấm lý do, không chấm người. Những ngày bạn không mở app không bao giờ bị đếm. Quay lại sau bao lâu cũng vậy, cái bàn chỉ nói một chữ: “Ngồi.”',
      heavyTitle: 'Gặp chuyện nặng lòng, thầy thôi diễn.',
      heavyBody:
        'Kết quả khám bệnh, chuyện mất mát, nợ nần, kiện tụng: lớp học lặng đi. Thầy tháo kính, ngồi cạnh bạn, nói những lời giản dị. Không đùa, không chấm điểm, không ngòi nổ, không phiếu xin khất.',
      crisisBody:
        'Nếu điều bạn viết cho thấy bạn có thể đang muốn làm hại bản thân, mọi việc sẽ tạm lui và số đường dây hỗ trợ hiện lên trước tiên.',
      helplines: 'Tìm đường dây hỗ trợ',
      heavyArt: 'Thầy Phú đã tháo kính, ngồi lặng lẽ',
    },
    tuition: {
      eyebrow: 'Học phí',
      title: 'Học thì miễn phí. Đóng học phí để có thêm.',
      freeTitle: 'Luôn miễn phí',
      free: [
        'Nói việc, cái bàn, tấm bảng',
        'Mọi tiết học, ngòi nổ và tiếng trống',
        'Lời phê và mọi dáng điệu của thầy',
        'Những chuyện bất ngờ và cái bàn khắc hình',
        'Sổ đầu bài, widget nhỏ, Live Activity',
        'Chia sẻ, và mọi thứ cho những ngày nặng lòng',
      ],
      paidTitle: 'Học phí',
      paid: ['Thời khoá biểu từ lịch của bạn', 'Widget lớn và StandBy', 'Học bạ mỗi học kỳ'],
      price: '499.000đ một năm hoặc 79.000đ một tháng, có một tuần học thử miễn phí.',
      scholarship: 'Chưa đóng được? Xin học bổng. Không cần giấy tờ.',
      more: 'Xem hết về học phí',
    },
    faq: {
      title: 'Hỏi nhanh.',
      items: [
        {
          q: 'Có miễn phí không?',
          a: 'Có. Cả lớp học miễn phí mãi mãi: nói việc, cái bàn, tấm bảng, mọi tiết học, lời phê, những chuyện bất ngờ và chia sẻ. Học phí mở thêm thời khoá biểu, widget lớn và học bạ.',
        },
        {
          q: 'Có cần tạo tài khoản không?',
          a: 'Không. Không cần đăng ký gì cả. Việc của bạn nằm trên điện thoại của bạn.',
        },
        {
          q: 'App này dành cho người ADHD?',
          a: 'App được làm cho người ADHD và cho bất kỳ ai hay trì hoãn. Đây là công cụ hỗ trợ: app không chẩn đoán hay điều trị bệnh gì.',
        },
        {
          q: 'Có chỉnh cho thầy hiền hơn được không?',
          a: 'Chỉ có một Thầy Phú, và thầy nghiêm. Điều thay đổi là việc đã nằm chờ bao lâu. Gặp chuyện nặng lòng, thầy tự thôi diễn.',
        },
        {
          q: 'Không có mạng thì sao?',
          a: 'Vẫn dùng được. Nói việc, cái bàn và mọi tiết học đều chạy không cần mạng. Những câu mới của thầy thì chờ có mạng.',
        },
        {
          q: 'App có những ngôn ngữ nào?',
          a: 'Tiếng Việt và tiếng Anh, mỗi lúc một thứ tiếng. Thầy nói theo ngôn ngữ của điện thoại, và bạn đổi được trong app.',
        },
      ],
    },
    tryIt: {
      eyebrow: 'Thử xem',
      title: 'Viết một việc lên bảng.',
      label: 'Một việc bạn đang né',
      placeholder: 'Email cho nha sĩ',
      button: 'Ghi lên bảng',
      again: 'Viết việc khác',
      note: 'Câu mẫu lấy từ bộ câu có sẵn của thầy. Những gì bạn gõ chỉ nằm trên trang này.',
      empty: 'Bảng trống trơn? Đáng ngờ.',
      plain: 'Thầy ghi rồi.',
      crisis: 'Cảm ơn bạn đã viết ra. Có những người thật sẵn sàng giúp bạn, ngay lúc này.',
      crisisLink: 'Tìm đường dây hỗ trợ',
    },
    end: {
      title: 'Ngồi.',
      body: 'Lớp Thầy Phú sắp có trên iPhone, bằng tiếng Việt và tiếng Anh.',
    },
  },
  footer: {
    tagline: 'Một việc trên bàn. Một thầy giáo ngồi chờ.',
    pages: 'Các trang',
    home: 'Trang chủ',
    tuition: 'Học phí',
    support: 'Hỗ trợ',
    helplines: 'Đường dây hỗ trợ',
    privacy: 'Quyền riêng tư',
    terms: 'Điều khoản',
    hardTime: 'Bạn đang thật sự khó khăn?',
    hardBody: 'Hãy nói chuyện với một người thật. Đường dây miễn phí, bảo mật, theo từng nước.',
    findHelpline: 'Tìm đường dây hỗ trợ',
    supportTool:
      'Lớp Thầy Phú là công cụ hỗ trợ để bắt đầu làm việc. App không chẩn đoán, điều trị hay chữa ADHD hay bất kỳ bệnh nào.',
    publisher: '© 2026 Odd Eggs Studio',
  },
  notFound: {
    title: 'Không có trên bảng · Lớp Thầy Phú',
    eyebrow: '404',
    line: 'Trang này không có trên bảng của thầy.',
    body: 'Thứ từng ở đây đã bị xoá rồi. Về chỗ ngồi đi em.',
    home: 'Về chỗ ngồi',
    support: 'Hỗ trợ',
    art: 'Thầy Phú giật mình',
  },
  tuitionPage: tuitionVi,
} as const satisfies SiteCopy;
