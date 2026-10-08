import { test, type Page } from '@playwright/test';

import { preLaunchUrl } from './playwright.config';
import {
  answerApi,
  caughtMonster,
  closedInvite,
  notFound,
  openInvite,
  sharedCard,
  sharedRecord,
  waitingHaunt,
  wildMonster,
} from './shared-fixtures';

// Sheets of the home page, the maker's states, the pages of shared things and the plain pages, for looking at beside the design. Runs only
// when CAPTURE_DIR names a folder to write into.
const out = process.env['CAPTURE_DIR'] ?? '';
test.skip(out === '', 'CAPTURE_DIR is not set');

const monster = {
  verdict: 'pass',
  result: 'monster',
  seed: 'dentist',
  bodyType: 'tooth',
  name: 'Molar, Keeper of Thursday',
  flavourText: 'Lives in the inbox. Pays no rent. Weak against “Hi Dr. Patel,”.',
};
const sizes = { desktop: { width: 1440, height: 900 }, phone: { width: 390, height: 844 } };

async function hatch(page: Page, answer: unknown, text: string) {
  await page.route('**/api/monster-make', (route) => route.fulfill({ json: answer }));
  await page.getByRole('textbox').fill(text);
  await page.getByRole('textbox').press('Enter');
  await page.waitForTimeout(2600);
}

for (const [size, viewport] of Object.entries(sizes)) {
  for (const scheme of ['light', 'dark'] as const) {
    for (const language of ['en', 'vi']) {
      test(`home ${size} ${scheme} ${language}`, async ({ browser }) => {
        const page = await browser.newPage({
          viewport,
          colorScheme: scheme,
          reducedMotion: 'reduce',
        });
        await page.goto(language === 'en' ? '/' : '/vi/');
        await page.screenshot({
          path: `${out}/home-${size}-${scheme}-${language}.png`,
          fullPage: true,
        });
      });
    }
  }
  test(`hatched ${size}`, async ({ browser }) => {
    const page = await browser.newPage({ viewport });
    await page.goto('/');
    await hatch(page, monster, 'the dentist email');
    await page.screenshot({ path: `${out}/hatched-${size}-light-en.png` });
  });
  test(`serious ${size}`, async ({ browser }) => {
    const page = await browser.newPage({ viewport });
    await page.goto('/');
    await hatch(page, { verdict: 'serious' }, 'a heavy thing');
    await page.screenshot({ path: `${out}/serious-${size}-light-en.png` });
  });
}

/** One page in one size, once its fetched parts have settled. */
function sheet(name: string, size: keyof typeof sizes, open: (page: Page) => Promise<void>): void {
  test(`${name} ${size}`, async ({ browser }) => {
    const page = await browser.newPage({ viewport: sizes[size], reducedMotion: 'reduce' });
    await open(page);
    // Reduce Motion, so that every section is in place rather than waiting to be scrolled to.
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${out}/${name}-${size}.png`, fullPage: true });
  });
}

for (const size of ['desktop', 'phone'] as const) {
  sheet('monster-wild', size, async (page) => {
    await answerApi(page, 'monster-page/*', wildMonster);
    await page.goto('/m/molar-7f3k9x');
  });
  sheet('monster-caught', size, async (page) => {
    await answerApi(page, 'monster-page/*', caughtMonster);
    await page.goto('/m/molar-7f3k9x');
  });
  sheet('monster-missing', size, async (page) => {
    await answerApi(page, 'monster-page/*', notFound, 404);
    await page.goto('/m/gone-000000');
  });
  sheet('caught-card', size, async (page) => {
    await answerApi(page, 'shared-card/*', sharedCard);
    await page.goto('/c/molar-041');
  });
  sheet('share-story', size, async (page) => {
    await answerApi(page, 'shared-story/*', { ...sharedCard, kind: 'story' });
    await page.goto('/s/priya-tue');
  });
  sheet('table-invite', size, async (page) => {
    await answerApi(page, 'table-invite/*', openInvite);
    await page.goto('/t/abcdefgh23');
  });
  sheet('table-invite-closed', size, async (page) => {
    await answerApi(page, 'table-invite/*', closedInvite);
    await page.goto('/t/abcdefgh23');
  });
  sheet('haunt', size, async (page) => {
    await answerApi(page, 'haunt-page/*', waitingHaunt);
    await page.goto('/h/abcdefgh234567ab');
  });
  sheet('haunt-shooed', size, async (page) => {
    await answerApi(page, 'haunt-page/*', waitingHaunt);
    await answerApi(page, 'haunt-page/*/shoo', { shooed: true });
    await page.goto('/h/abcdefgh234567ab');
    await page.locator('[data-shoo]').click();
  });
  sheet('record', size, async (page) => {
    await answerApi(page, 'shared-record/*', sharedRecord);
    await page.goto('/r/bin-bags');
  });
  sheet('record-vi', size, async (page) => {
    await answerApi(page, 'shared-record/*', sharedRecord);
    await page.goto('/vi/r/bin-bags');
  });
  for (const plain of ['privacy', 'terms', 'support', 'helplines', 'what-scootch-is', 'press']) {
    sheet(plain, size, (page) => page.goto(`/${plain}`).then(() => undefined));
  }
  sheet('plus', size, (page) => page.goto('/plus').then(() => undefined));
  sheet('plus-dark', size, async (page) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/plus');
  });
  for (const page of ['help', 'get', 'vi/help', 'vi/plus', 'no-such-page']) {
    sheet(page.replace('/', '-'), size, (opened) => opened.goto(`/${page}`).then(() => undefined));
  }
  sheet('get-monster', size, async (page) => {
    await answerApi(page, 'monster-page/*', wildMonster);
    await page.goto('/get?m=molar-7f3k9x');
  });
  sheet('privacy-vi', size, (page) => page.goto('/vi/privacy').then(() => undefined));
  sheet('android', size, (page) => page.goto('/android').then(() => undefined));
  sheet('pre-launch-hatched', size, async (page) => {
    await page.goto(`${preLaunchUrl}/`);
    await hatch(page, monster, 'the dentist email');
  });
  sheet('pre-launch-monster', size, async (page) => {
    await answerApi(page, 'monster-page/*', wildMonster);
    await page.goto(`${preLaunchUrl}/m/molar-7f3k9x`);
  });
}
