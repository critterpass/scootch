/** The website's own words in English, and the source of the key set. */
export const en = {
  brand: { name: 'Phu’s Class' },
  meta: {
    title: 'Phu’s Class',
    description: 'Phu’s Class is coming to iPhone, in English and Vietnamese.',
  },
  nav: {
    label: 'Main',
    help: 'Help',
    menu: 'Menu',
    getTheApp: 'Get the app',
    skip: 'Skip to the page',
  },
  home: {
    headline: 'Phu’s Class.',
    intro: 'Coming to iPhone, in English and Vietnamese.',
    linksTitle: 'On this site',
  },
  badge: { alt: 'Download on the App Store' },
  footer: {
    tagline: 'Small things, one at a time, with someone quietly sitting next to you.',
    brand: 'Phu’s Class',
    whatItIs: 'What Phu’s Class is and isn’t',
    help: 'Help',
    support: 'Support and questions',
    helplines: 'Helplines',
    privacy: 'Privacy',
    terms: 'Terms',
    hardTime: 'Having a really hard time?',
    hardBody: 'You deserve a real person. Find a free, confidential helpline in your country.',
    findHelpline: 'Find a helpline',
    supportTool:
      'Phu’s Class is a support tool for starting things. It doesn’t diagnose, treat or cure ADHD or anything else.',
    copyright: '© 2026 Phu’s Class',
    otherLanguage: 'Tiếng Việt',
  },
} as const;

export type Loosen<T> = T extends string
  ? string
  : T extends readonly (infer Item)[]
    ? readonly Loosen<Item>[]
    : { readonly [Key in keyof T]: Loosen<T[Key]> };

/** Every language carries exactly the English key set. */
export type SiteCopy = Loosen<typeof en>;
