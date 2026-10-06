import type { Language } from '@scootch/i18n';

export type Helpline = {
  readonly country: Readonly<Record<Language, string>>;
  readonly name: string;
  readonly action: Readonly<Record<Language, string>>;
  readonly href: string;
};

// NEEDS VERIFICATION BEFORE LAUNCH: every number and address below is taken from the design
// board and has not been checked against the service's own site. Each one must be verified, and
// then checked on a schedule, before the site is public.
//
// Vietnam: no crisis line has been verified, so the page shows the national medical emergency
// number (115, also to be verified) and a way to find a helpline. The founder supplies a verified
// Vietnamese line before launch.
export const helplines: readonly Helpline[] = [
  {
    country: { en: 'United States', vi: 'Hoa Kỳ' },
    name: '988 Suicide & Crisis Lifeline',
    action: { en: 'Call or text 988', vi: 'Gọi hoặc nhắn tin tới 988' },
    href: 'tel:988',
  },
  {
    country: { en: 'Canada', vi: 'Canada' },
    name: '988 Suicide Crisis Helpline',
    action: { en: 'Call or text 988', vi: 'Gọi hoặc nhắn tin tới 988' },
    href: 'tel:988',
  },
  {
    country: { en: 'United Kingdom and Ireland', vi: 'Vương quốc Anh và Ireland' },
    name: 'Samaritans',
    action: { en: 'Call 116 123', vi: 'Gọi 116 123' },
    href: 'tel:116123',
  },
  {
    country: { en: 'Australia', vi: 'Úc' },
    name: 'Lifeline',
    action: { en: 'Call 13 11 14', vi: 'Gọi 13 11 14' },
    href: 'tel:131114',
  },
  {
    country: { en: 'New Zealand', vi: 'New Zealand' },
    name: 'Need to talk?',
    action: { en: 'Call or text 1737', vi: 'Gọi hoặc nhắn tin tới 1737' },
    href: 'tel:1737',
  },
  {
    country: { en: 'India', vi: 'Ấn Độ' },
    name: 'Tele-MANAS',
    action: { en: 'Call 14416', vi: 'Gọi 14416' },
    href: 'tel:14416',
  },
];

/** Vietnam, until a verified crisis line exists: the emergency number and a way to find a line. */
export const vietnam = {
  country: { en: 'Vietnam', vi: 'Việt Nam' },
  emergency: { action: { en: 'Call 115', vi: 'Gọi 115' }, href: 'tel:115' },
} as const;

export const findAHelpline = {
  name: 'Find A Helpline',
  label: 'findahelpline.com',
  href: 'https://findahelpline.com',
} as const;
