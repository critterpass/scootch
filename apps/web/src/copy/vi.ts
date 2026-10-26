import type { SiteCopy } from './en';

/** The website's words in Vietnamese, written as a Vietnamese site would say them. */
export const vi = {
  brand: { name: 'Lớp Thầy Phú' },
  meta: {
    title: 'Lớp Thầy Phú',
    description: 'Lớp Thầy Phú sắp có trên iPhone, bằng tiếng Việt và tiếng Anh.',
  },
  nav: {
    label: 'Chính',
    help: 'Trợ giúp',
    menu: 'Menu',
    getTheApp: 'Tải app',
    skip: 'Tới thẳng nội dung',
  },
  home: {
    headline: 'Lớp Thầy Phú.',
    intro: 'Sắp có trên iPhone, bằng tiếng Việt và tiếng Anh.',
    linksTitle: 'Trên trang này',
  },
  badge: { alt: 'Tải về trên App Store' },
  footer: {
    tagline: 'Từng việc nhỏ một, có người ngồi lặng lẽ bên cạnh.',
    brand: 'Lớp Thầy Phú',
    whatItIs: 'Lớp Thầy Phú là gì và không là gì',
    help: 'Trợ giúp',
    support: 'Hỗ trợ và câu hỏi',
    helplines: 'Đường dây hỗ trợ',
    privacy: 'Quyền riêng tư',
    terms: 'Điều khoản',
    hardTime: 'Đang có chuyện rất khó khăn?',
    hardBody:
      'Bạn xứng đáng có một con người thật lắng nghe. Tìm đường dây hỗ trợ miễn phí, kín đáo ở nước bạn.',
    findHelpline: 'Tìm đường dây hỗ trợ',
    supportTool:
      'Lớp Thầy Phú là công cụ hỗ trợ để bắt đầu việc. Lớp Thầy Phú không chẩn đoán, điều trị hay chữa ADHD hoặc bất cứ điều gì khác.',
    copyright: '© 2026 Lớp Thầy Phú',
    otherLanguage: 'English',
  },
} as const satisfies SiteCopy;
