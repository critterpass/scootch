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

export const notFound = {
  error: { code: 'not_found', message: 'No such shared monster', retryable: false },
};

/** Answers one of the site's API doors at the network boundary. */
export async function answerApi(
  page: Page,
  route: string,
  json: unknown,
  status = 200,
): Promise<void> {
  await page.route(`**/api/${route}`, (request) => request.fulfill({ status, json }));
}
