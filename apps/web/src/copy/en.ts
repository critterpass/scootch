import { homeEn } from './home-en';

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
    how: 'How it works',
    tables: 'Tables',
    help: 'Help',
    menu: 'Menu',
    getTheApp: 'Get the app',
    skip: 'Skip to the monster maker',
  },
  badge: { alt: 'Download on the App Store' },
  footer: {
    tagline: 'Small things, one at a time, with someone quietly sitting next to you.',
    scootch: 'Scootch',
    whatItIs: 'What Scootch is and isn’t',
    help: 'Help',
    support: 'Support and questions',
    helplines: 'Helplines',
    privacy: 'Privacy',
    terms: 'Terms',
    getTheApp: 'Get the app · Android · Press',
    hardTime: 'Having a really hard time?',
    hardBody: 'You deserve a real person. Find a free, confidential helpline in your country.',
    findHelpline: 'Find a helpline',
    supportTool:
      'Scootch is a support tool for starting things. It doesn’t diagnose, treat or cure ADHD or anything else.',
    copyright: '© 2026 Scootch · Made with mild panic',
    otherLanguage: 'Tiếng Việt',
  },
  maker: {
    news: 'New',
    newsLine: 'Tables, foil finishes, and the hunt on your Lock Screen',
    headline: 'What have you been avoiding?',
    sub: 'Type it. I’ll turn it into a monster. Then we catch it together, ten minutes at a time. You’ll feel better. Probably.',
    bubble: 'Go on. I won’t judge. Much.',
    typing: [
      'the dentist email',
      'my taxes',
      'replying to mum',
      'the wobbly shelf',
      'the gym',
      'that one form',
    ],
    hatchingTitle: 'Something’s hatching…',
    hold: 'Hold to catch',
    holding: 'Keep holding…',
    holdIdle: 'Hold to catch it. In the app, every monster has a catch of its own.',
    holdEarly: 'Starting counts. Hold a little longer.',
    holdDone: 'That’s how every catch feels.',
    caught: 'Caught',
    onShelf: 'On your shelf',
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
  strip: {
    label: 'A few I hatched earlier',
    monsters: [
      { name: 'Unread, the Ever-Bold', flavour: '412 unread. Has started naming them.' },
      { name: 'The Receipt Hydra', flavour: 'Grows a head for every receipt you lost.' },
      { name: 'Baron von Grout', flavour: 'Owns the bathroom now. Has a monocle.' },
      { name: 'Ringaling', flavour: 'Rings in your head, not your phone.' },
      { name: 'Lunge Goblin', flavour: 'Lives in the gym bag. Smells of intent.' },
      { name: 'Thirsty Fern', flavour: 'Dramatic. Has fainted twice this week.' },
    ],
  },
  ...homeEn,
} as const;

export type Loosen<T> = T extends string
  ? string
  : T extends readonly (infer Item)[]
    ? readonly Loosen<Item>[]
    : { readonly [Key in keyof T]: Loosen<T[Key]> };

/** Every language carries exactly the English key set. */
export type SiteCopy = Loosen<typeof en>;
