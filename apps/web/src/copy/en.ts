import { tuitionEn } from './tuition-en';

/**
 * The website's own words in English, and the source of the key set every language must carry.
 * Lines in quotes are Thầy Phú's: about the task, never about the person (brief, section 4).
 */
export const en = {
  brand: { name: 'Phu’s Class', short: 'Phu’s Class' },
  nav: {
    label: 'Main',
    loop: 'The class',
    tuition: 'Tuition',
    support: 'Support',
    menu: 'Menu',
    getTheApp: 'Get the app',
    skip: 'Skip to the page',
    otherLanguage: 'Tiếng Việt',
    otherLanguageLabel: 'Đọc trang này bằng tiếng Việt',
  },
  badge: {
    alt: 'Download on the App Store',
    comingSoon: 'Coming soon to the App Store',
  },
  home: {
    title: 'Phu’s Class: one task on your desk, and a teacher who waits',
    description:
      'A strict, round, tea-drinking teacher for people with ADHD and chronic procrastinators. Say everything. He puts one thing on your desk and waits.',
    hero: {
      eyebrow: 'For iPhone · for ADHD and chronic procrastinators',
      title: 'Phu’s Class',
      line: 'Two minutes. I’ll wait.',
      lede: 'Thầy Phú has taught for thirty-two years and heard every excuse there is. Tell him everything you’ve been putting off. He writes it all on the board, puts one thing on your desk, and waits for you to start.',
      boardDate: 'Monday',
      board: ['Dentist email', 'Landlord email', 'Renew passport'],
      boardMore: '+ 4 more',
      art: 'Thầy Phú at his desk, sipping tea over his glasses, in front of a chalkboard',
    },
    loop: {
      eyebrow: 'One period',
      title: 'How a class goes.',
      say: {
        title: 'Say it.',
        body: 'Hold to talk, or type. Ramble as long as you like: every task flies up onto the board as a chalk note. Hearing happens on your phone, with or without a connection.',
        said: '“ugh, the dentist email, and the passport, and I said I’d call the landlord…”',
      },
      pick: {
        title: 'He picks.',
        body: 'One task goes on your desk, with one line on why. Anything due today first, then whatever has waited longest.',
        task: 'Dentist email',
        line: 'Nine days on the board. It goes first.',
      },
      fuse: {
        title: 'The fuse.',
        body: 'The desk opens with a short wait. The fuse burns around Start, and the longer a task sits, the rounder he gets. Starting resets everything.',
        start: 'Start',
        step: 'Pressure {n}',
        stepsLabel: 'His pressure, from 0 to 5',
        steps: [
          { pose: 'Looks up', line: 'Two minutes. I’ll wait.' },
          { pose: 'Sips tea over his glasses', line: 'This tea was hot when you sat down.' },
          { pose: 'Arms crossed', line: 'We both know how this ends.' },
          { pose: 'Taps the ruler', line: 'Tap. Tap.' },
          { pose: 'Your full name, puffed and pink', line: 'TRẦN. MINH. ANH.' },
          { pose: 'Silence. His glasses turn white', line: '…' },
        ],
        hint: 'Watch him wait, or tap a step.',
      },
      drum: {
        title: 'The drum.',
        body: 'Start, and the school drum sounds. A period is ten minutes. He paces the front of the room and grades papers, and now and then looks straight at you. Raise a hand for a tiny next step.',
        beat: 'Tùng! Tùng! Tùng!',
      },
      pen: {
        title: 'The red pen.',
        body: 'Done, and a red check draws itself. His comment depends on the task: started inside the fuse, no late slips, how long it waited. Not yet? Partial credit, and three ways on.',
        paper: 'Dentist email',
        waited: 'Waited 9 days. Took 11 minutes.',
        ladder: ['Fine.', 'Good.', 'Good work.'],
        ten: '10',
        tenNote: 'The circled 10 is rare. It is never sold or scheduled.',
      },
    },
    never: {
      eyebrow: 'The classroom',
      title: 'Never the same twice.',
      lede: 'About one class in four, something small happens. Nobody explains it.',
      happenings: [
        { art: 'cat', title: 'A cat walks across his desk.', line: 'Not now, Mèo.', after: '' },
        { art: 'plane', title: 'A paper plane drifts in.', line: 'Whose is this?', after: '' },
        {
          art: 'candle',
          title: 'The power cuts.',
          line: 'We continue.',
          after: 'He lights a candle.',
        },
        {
          art: 'icecream',
          title: 'An ice-cream bell outside.',
          line: 'After the bell. Maybe.',
          after: '',
        },
        {
          art: 'butterfly',
          title: 'A butterfly lands on the board.',
          line: '',
          after: 'He writes around it.',
        },
        {
          art: 'papers',
          title: 'Pop-quiz day.',
          line: 'Take out a sheet of paper.',
          after: 'Periods are fifteen minutes.',
        },
      ],
      seasonsTitle: 'From the real calendar',
      seasons: [
        { art: 'bucket', title: 'Monsoon', body: 'Rain on the window, a bucket under the leak.' },
        { art: 'peach', title: 'Tết', body: 'Peach blossom, and a bánh chưng on his desk.' },
        { art: 'lantern', title: 'Mid-Autumn', body: 'A star lantern in the window.' },
        {
          art: 'bouquet',
          title: '20 November',
          body: 'Teachers’ Day. Flowers piled on his desk. He is quietly moved.',
        },
        { art: 'cake', title: 'His birthday', body: 'One candle. He tells nobody.' },
        { art: 'coffee', title: 'Hot days', body: 'Iced coffee instead of tea.' },
      ],
      deskTitle: 'Your desk remembers.',
      deskBody:
        'Every finished task carves one small doodle into your desk: initials, a star, a tiny Thầy Phú. It never loses a mark.',
    },
    rules: {
      eyebrow: 'House rules',
      title: 'What he never does.',
      struck: ['Streaks', 'Points and leaderboards', 'Taking attendance', 'Remarks about you'],
      body: 'He is relentless about the task and never about you. He grades excuses, never people. Days away are never counted. Come back after any time at all and the desk says one word: “Sit.”',
      heavyTitle: 'For heavy things, the act stops.',
      heavyBody:
        'Medical results, grief, debt, legal trouble: the classroom goes quiet. He takes off his glasses and keeps plain company. No joke, no grade, no fuse, no late slip.',
      crisisBody:
        'If something you write sounds like you might hurt yourself, every task steps aside and helplines come first.',
      helplines: 'Find a helpline',
      heavyArt: 'Thầy Phú with his glasses off, sitting quietly',
    },
    tuition: {
      eyebrow: 'Tuition',
      title: 'The class is free. Tuition adds the extras.',
      freeTitle: 'Free, always',
      free: [
        'Saying tasks, the desk, the board',
        'Every period, the fuse and the drum',
        'His comments and every pose',
        'The happenings and your carved desk',
        'The logbook, the small widget, the Live Activity',
        'Sharing, and everything for heavy days',
      ],
      paidTitle: 'Tuition',
      paid: [
        'The timetable from your calendar',
        'Big widgets and StandBy',
        'A report card each term',
      ],
      price: '$39.99 a year or $6.99 a month, with a free week first.',
      scholarship: 'Can’t pay right now? Ask for a scholarship. No proof.',
      more: 'All about tuition',
    },
    faq: {
      title: 'Questions.',
      items: [
        {
          q: 'Is it free?',
          a: 'Yes. The whole class is free for good: saying tasks, the desk, the board, every period, his comments, the happenings and sharing. Tuition adds the timetable, big widgets and the report card.',
        },
        {
          q: 'Do I need an account?',
          a: 'No. There is no sign-up. Your tasks live on your phone.',
        },
        {
          q: 'Is it for ADHD?',
          a: 'It is built for people with ADHD and for anyone who puts things off. It is a support tool: it does not diagnose or treat anything.',
        },
        {
          q: 'Can I turn him down?',
          a: 'There is one Thầy Phú, and he is strict. What changes is how long the task has waited. For anything heavy, he stops the act on his own.',
        },
        {
          q: 'Does it work offline?',
          a: 'Yes. Hearing a task, the desk and every period work with no connection. His fresh lines wait for one.',
        },
        {
          q: 'Which languages?',
          a: 'English and Vietnamese, one at a time. He speaks whichever your phone does, and you can switch in the app.',
        },
      ],
    },
    tryIt: {
      eyebrow: 'Try him',
      title: 'Write a task on the board.',
      label: 'A task you’ve been putting off',
      placeholder: 'Email the dentist',
      button: 'Write it up',
      again: 'Another one',
      note: 'A sample from his offline lines. What you type stays on this page.',
      empty: 'Nothing on the board? Suspicious.',
      plain: 'Written down.',
      crisis: 'Thank you for writing that here. Real people can help with this, right now.',
      crisisLink: 'Find a helpline',
    },
    end: {
      title: 'Sit.',
      body: 'Phu’s Class is coming to iPhone in English and Vietnamese.',
    },
  },
  footer: {
    tagline: 'One task on your desk. A teacher who waits.',
    pages: 'Pages',
    home: 'Home',
    tuition: 'Tuition',
    support: 'Support',
    helplines: 'Helplines',
    privacy: 'Privacy',
    terms: 'Terms',
    hardTime: 'Having a really hard time?',
    hardBody: 'Talk to a real person. Free, confidential helplines, by country.',
    findHelpline: 'Find a helpline',
    supportTool:
      'Phu’s Class is a support tool for starting things. It does not diagnose, treat or cure ADHD or anything else.',
    publisher: '© 2026 Odd Eggs Studio',
  },
  notFound: {
    title: 'Not on the board · Phu’s Class',
    eyebrow: '404',
    line: 'This page is not on my board.',
    body: 'Whatever was here has been erased. Back to your desk.',
    home: 'Back to the desk',
    support: 'Support',
    art: 'Thầy Phú, startled',
  },
  tuitionPage: tuitionEn,
} as const;

export type Loosen<T> = T extends string
  ? string
  : T extends readonly (infer Item)[]
    ? readonly Loosen<Item>[]
    : { readonly [Key in keyof T]: Loosen<T[Key]> };

/** Every language carries exactly the English key set. */
export type SiteCopy = Loosen<typeof en>;
