import { helpVi } from './help-vi';

import type { Loosen } from './en';
import type { pagesEn } from './pages-en';

/** The same pages in Vietnamese, written the way a Vietnamese site would say them. */
export const pagesVi = {
  notFound: {
    title: 'Trang này đi lạc rồi · Lớp Thầy Phú',
    eyebrow: 'Không tìm thấy trang',
    headline: 'Trang này đi lạc rồi. Y như mọi khi.',
    body: 'Mới phút trước nó còn ở đây. Thử mấy chỗ này nha.',
    home: 'Về trang chủ',
    help: 'Trợ giúp',
  },
  preLaunch: {
    comingSoon: 'Sắp có trên iPhone',
  },
  ...helpVi,
} as const satisfies Loosen<typeof pagesEn>;
