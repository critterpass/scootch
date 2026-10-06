import { test, type Page } from '@playwright/test';

// Sheets of the home page and the maker's states, for looking at beside the design. Runs only
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
        const page = await browser.newPage({ viewport, colorScheme: scheme });
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
