import type { Page } from '@playwright/test';

/** Answers shaped like the API's, for the pages of shared things. */
export const wildMonster = {
  id: 'molar-7f3k9x',
  seed: 'dentist',
  bodyType: 'tooth',
  name: 'Molar, Keeper of Thursday',
  flavourText: 'Lives in the inbox. Pays no rent. Weak against “Hi Dr. Patel,”.',
  language: 'en',
  typed: null,
  status: 'wild',
  caughtAt: null,
  catchMinutes: null,
  sharedAt: '2026-10-06T08:00:00.000Z',
};

export const caughtMonster = {
  ...wildMonster,
  status: 'caught',
  caughtAt: '2026-10-06T07:52:00.000Z',
  catchMinutes: 9,
};

export const sharedCard = {
  id: 'molar-041',
  kind: 'card',
  language: 'en',
  sharedAt: '2026-10-06T08:00:00.000Z',
  sharerName: 'Priya',
  headline: 'Emailed the dentist.',
  card: {
    monster: {
      bodyType: 'tooth',
      seed: 'dentist',
      ink: 'lilac',
      size: 1,
      eyes: { count: 3, style: 'matched' },
      mouth: 'fangs',
      horns: 'none',
      antennae: 0,
      legs: 'none',
    },
    name: 'Molar, Keeper of Thursday',
    title: 'Inbox dweller',
    rarity: 'uncommon',
    number: 41,
    taskLine: null,
    daysLurked: 214,
    catchMinutes: 9,
    dread: 4,
    flavourText: 'Lives in the inbox. Pays no rent. Weak against “Hi Dr. Patel,”.',
    finish: 'standard',
    caughtOn: '2026-10-06',
  },
};

/** A table invite as a stranger may see it: first names and one-word labels, or neither. */
export const openInvite = {
  state: 'open',
  hostName: 'Priya',
  closedAt: null,
  seats: [
    { name: 'Priya', label: 'admin', workMode: 'email' },
    { name: 'Dana', label: 'writing', workMode: 'writing' },
    // This person hides both their name and their label.
    { name: null, label: null, workMode: null },
  ],
};

export const closedInvite = {
  ...openInvite,
  state: 'closed',
  closedAt: '2026-10-06T15:20:00.000Z',
};

/** A waiting haunt, shaped like the API's own view of one, without the sender's account id. */
export const waitingHaunt = {
  id: 'abcdefgh234567ab',
  bodyType: 'receipt',
  seed: '3f9a2c1e77b04d5a',
  dare: 'two_minutes',
  sentAt: '2026-10-06T08:00:00.000Z',
  from: { displayName: 'Priya' },
  state: 'waiting',
};

export const sharedRecord = {
  id: 'bin-bags',
  language: 'en',
  sharedAt: '2026-10-12T18:00:00.000Z',
  sharerName: 'Priya',
  title: 'Molar and the Bin Bags',
  line: 'Seven finished days, seven instruments.',
  weekStart: '2026-10-05',
  tracks: [
    { day: '2026-10-05', name: 'Unread, the Ever-Bold', bodyType: 'envelope', seed: 'a1' },
    { day: '2026-10-06', name: 'Molar, Keeper of Thursday', bodyType: 'tooth', seed: 'a2' },
    { day: '2026-10-07', name: 'Ringaling', bodyType: 'phone', seed: 'a3' },
    { day: '2026-10-08', name: 'Baron von Grout', bodyType: 'slime', seed: 'a4' },
    { day: '2026-10-09', name: 'The Receipt Hydra', bodyType: 'receipt', seed: 'a5' },
    { day: '2026-10-10', name: 'Thirsty Fern', bodyType: 'weed', seed: 'a6' },
    { day: '2026-10-11', name: 'The Snooze Lord', bodyType: 'kettle', seed: 'a7' },
  ],
};

export const notFound = {
  error: { code: 'not_found', message: 'No such shared monster', retryable: false },
};

const globToRegex = (glob: string): RegExp =>
  new RegExp(`${glob.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replaceAll('*', '[^/]*')}$`);

/** Answers one of the site's API doors at the network boundary. */
export async function answerApi(
  page: Page,
  route: string,
  json: unknown,
  status = 200,
): Promise<void> {
  // With or without the page's language beside the route.
  await page.route(
    (url) => globToRegex(`/api/${route}`).test(url.pathname),
    (request) => request.fulfill({ status, json }),
  );
}
