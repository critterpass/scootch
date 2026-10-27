// The App Store frames, in order: which registry state each one shows, and its caption in each
// language. Captions are marketing copy, not Thầy Phú's lines, but they pass his word check all the
// same (render.ts refuses to draw a frame whose caption fails it). One language per frame, short.

export type FrameLanguage = 'en' | 'vi';

export type Caption = {
  /** The large line at the top. */
  readonly title: string;
  /** One smaller line under it. */
  readonly sub: string;
};

export type Frame = {
  /** The registry state captured on the simulator, as `<state>--<lang>-light-default.png`. */
  readonly state: string;
  readonly caption: Readonly<Record<FrameLanguage, Caption>>;
};

export const frames: readonly Frame[] = [
  {
    state: 'desk-hot',
    caption: {
      en: { title: 'One task on the desk.', sub: 'He is not going anywhere.' },
      vi: { title: 'Một việc trên bàn.', sub: 'Thầy ngồi đây chờ em bắt đầu.' },
    },
  },
  {
    state: 'board-full',
    caption: {
      en: { title: 'Everything on the board.', sub: 'You only ever face one thing.' },
      vi: { title: 'Mọi việc trên bảng.', sub: 'Em chỉ đối mặt một việc thôi.' },
    },
  },
  {
    state: 'session-running',
    caption: {
      en: { title: 'Start. He keeps the time.', sub: 'The drum opens the period.' },
      vi: { title: 'Bắt đầu đi. Thầy canh giờ.', sub: 'Tiếng trống mở đầu tiết học.' },
    },
  },
  {
    state: 'share-certificate',
    caption: {
      en: { title: 'Starting is the win.', sub: 'He signs the certificate himself.' },
      vi: { title: 'Bắt đầu là thắng.', sub: 'Thầy tự tay ký giấy khen.' },
    },
  },
  {
    state: 'report-card',
    caption: {
      en: { title: 'A report card each term.', sub: 'What you handed in. No scores.' },
      vi: { title: 'Học bạ mỗi học kỳ.', sub: 'Những việc em đã nộp. Không chấm điểm.' },
    },
  },
  {
    state: 'tuition-offer',
    caption: {
      en: {
        title: 'One free week of tuition.',
        sub: 'Cancel before it ends and nothing is charged.',
      },
      vi: { title: 'Học thử một tuần, miễn phí.', sub: 'Huỷ trước khi hết tuần thì không thu gì.' },
    },
  },
];
