/**
 * The website's own words in English, and the source of the key set. The interface words the site
 * shares with the app (the brand, "Plus") come from `@scootch/i18n`; a monster's name and card
 * line are written per visitor by the API, never here.
 */
export const en = {
  meta: {
    title: 'Scootch: what have you been avoiding?',
    description:
      'Type the thing you have been avoiding. Scootch turns it into a monster, then helps you start it: one small thing a day.',
  },
  nav: {
    label: 'Main',
    maker: 'Monster maker',
    help: 'Help',
    menu: 'Menu',
    getTheApp: 'Get the app',
    skip: 'Skip to the monster maker',
  },
  badge: { alt: 'Download on the App Store' },
  footer: {
    tagline: 'One small thing a day, sitting quietly next to someone.',
    scootch: 'Scootch',
    whatItIs: 'What Scootch is and isn’t',
    press: 'Press kit',
    help: 'Help',
    support: 'Support and questions',
    helplines: 'Helplines',
    privacy: 'Privacy',
    terms: 'Terms',
    elsewhere: 'Elsewhere',
    android: 'Android: tell me',
    hardTime: 'Having a really hard time?',
    findHelpline: 'Find a helpline in your country',
    supportTool:
      'Scootch is a support tool for starting things. It doesn’t diagnose, treat or cure ADHD or anything else.',
    copyright: '© 2026 Scootch · Made with mild panic',
    otherLanguage: 'Tiếng Việt',
  },
  maker: {
    headline: 'What have you been avoiding?',
    sub: 'Type it. I’ll turn it into a monster. You’ll feel better. Probably.',
    fieldLabel: 'The thing you have been avoiding',
    placeholder: 'e.g. the dentist email',
    hatch: 'Hatch it',
    examplesLabel: 'Examples',
    examples: ['my taxes', 'the dentist email', 'the gym', 'replying to mum', 'the bathroom'],
    note: 'No sign-up. Nothing you type is kept unless you share the card.',
    empty: 'Type anything. Even one word.',
    nonsense: 'That’s a keyboard sneeze, not a task. Try a few words.',
    hatching: 'Hatching… Shaking the egg. About two seconds.',
    hatchedEyebrow: 'It hatched',
    meet: 'Meet {name}.',
    wild: 'Wild',
    notCaught: 'Not caught yet',
    cardLabel: '{name}. A wild monster. {flavour}',
    showTyped: 'Show what I typed',
    typedShown: 'The card shows “{text}”.',
    typedHidden: 'Hidden. The card just says WILD.',
    catchIt: 'Catch it in the app',
    save: 'Save card',
    another: 'Hatch another',
    napTitle: 'Twelve monsters. I need a lie down.',
    napBody: 'The hatchery reopens in five minutes. Your last one is still here.',
    napCatch: 'Catch the last one in the app',
    napOk: 'Okay, have a nap',
    offlineTitle: 'No signal. My hatchery runs on wifi.',
    offlineBody: 'I kept what you typed. Try again when you’re back online.',
    tryAgain: 'Try again',
    seriousTitle: 'That sounds really heavy. I won’t make a monster out of it.',
    seriousBody: 'If things feel like too much right now, you don’t have to handle it on your own.',
    helplineLocal: 'Call or text 988 · Suicide & Crisis Lifeline',
    helplineLocalHref: 'tel:988',
    helplineElsewhere: 'Not in the US? Find a helpline in your country',
    someoneYouTrust: 'Or talk to someone you trust. Text a friend. That counts.',
    helplineNote:
      'Shown for the United States. Helplines change with your country. If you’re in immediate danger, call your local emergency number.',
    somethingElse: 'Make something else',
  },
  demo: {
    eyebrow: 'How it goes',
    headline: 'From “ugh” to caught, in four taps.',
    beats: [
      'Ramble at Scootch for twenty seconds.',
      'One thing comes back, and hatches.',
      'Start. Scootch loses its mind with joy.',
      'Hold to finish. The monster is yours.',
    ],
  },
  ideas: [
    {
      title: 'One thing a day.',
      body: 'Ramble at me. I’ll pick one thing and hide the rest in a drawer.',
    },
    {
      title: 'A monster for every task.',
      body: 'The dentist email becomes Molar. Catch him and he’s yours for ever.',
    },
    {
      title: 'Quiet company at a table.',
      body: 'Sit with up to three friends doing their own thing. No chat.',
    },
  ],
  strip: {
    headline: 'Fresh from other people’s lists.',
    monsters: [
      { name: 'Unread, the Ever-Bold', flavour: '412 unread. Has started naming them.' },
      { name: 'The Receipt Hydra', flavour: 'Grows a head for every receipt you lost.' },
      { name: 'Baron von Grout', flavour: 'Owns the bathroom now. Has a monocle.' },
      { name: 'Ringaling', flavour: 'Rings in your head, not your phone.' },
      { name: 'Lunge Goblin', flavour: 'Lives in the gym bag. Smells of intent.' },
      { name: 'Thirsty Fern', flavour: 'Dramatic. Has fainted twice this week.' },
    ],
  },
  prices: {
    freeEyebrow: 'Free for ever',
    freeHeadline: 'The whole thing, one thing a day.',
    free: [
      'One thing a day, for ever',
      'Every monster you catch, kept for ever',
      'Tables with friends',
      'All three attitudes',
      'The weekly song, and sharing it',
    ],
    plusEyebrow: 'Scootch Plus',
    plusHeadline: 'A bit more Scootch, for a small fee.',
    plans: [
      { name: 'Monthly', price: '$5.99', detail: 'a month' },
      { name: 'Yearly', price: '$39.99', detail: '7 days free first' },
      { name: 'Lifetime', price: '$89.99', detail: 'once, for ever' },
    ],
    plus: [
      'A second and third thing on good days',
      'Open your own tables for friends',
      'Keep every weekly record',
      'The binder, with sorting and stats',
      'Extra-large widget and StandBy',
    ],
    reminder:
      'I’ll remind you the day before any charge. Cancel in two taps in your Apple settings.',
    allAboutPlus: 'All about Plus',
  },
  who: {
    eyebrow: 'Who it’s for',
    headline:
      'For people with ADHD, and for anyone whose to-do list has its own to-do list. If starting is the hard part, I’m your critter.',
  },
} as const;

type Loosen<T> = T extends string
  ? string
  : T extends readonly (infer Item)[]
    ? readonly Loosen<Item>[]
    : { readonly [Key in keyof T]: Loosen<T[Key]> };

/** Every language carries exactly the English key set. */
export type SiteCopy = Loosen<typeof en>;
