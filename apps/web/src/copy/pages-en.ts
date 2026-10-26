import { helpEn } from './help-en';

/** The words of the not-found page, the Help page and the pages around launch, in English. */
export const pagesEn = {
  notFound: {
    title: 'This page wandered off · Phu’s Class',
    eyebrow: 'Page not found',
    headline: 'This page wandered off. Classic.',
    body: 'It was here a minute ago. Try one of these instead.',
    home: 'Back home',
    help: 'Help',
  },
  preLaunch: {
    comingSoon: 'Coming soon to iPhone',
  },
  ...helpEn,
} as const;
