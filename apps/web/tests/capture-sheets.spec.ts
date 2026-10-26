import { test, type Page } from '@playwright/test';

import { preLaunchUrl } from './playwright.config';

// Sheets of every page, for looking at beside the design. Runs only when CAPTURE_DIR names a
// folder to write into.
const out = process.env['CAPTURE_DIR'] ?? '';
test.skip(out === '', 'CAPTURE_DIR is not set');

const sizes = { desktop: { width: 1440, height: 900 }, phone: { width: 390, height: 844 } };
const pages = ['', 'tuition', 'privacy', 'terms', 'support', 'helplines'];

/** One page in one size. */
function sheet(
  name: string,
  size: keyof typeof sizes,
  open: (page: Page) => Promise<unknown>,
): void {
  test(`${name} ${size}`, async ({ browser }) => {
    const page = await browser.newPage({ viewport: sizes[size], reducedMotion: 'reduce' });
    await open(page);
    // Reduce Motion, so that every section is in place rather than waiting to be scrolled to.
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${out}/${name}-${size}.png`, fullPage: true });
  });
}

for (const size of ['desktop', 'phone'] as const) {
  for (const name of pages) {
    sheet(name || 'home', size, (page) => page.goto(`/${name}`));
    sheet(`${name || 'home'}-vi`, size, (page) => page.goto(`/vi/${name}`));
  }
  sheet('not-found', size, (page) => page.goto('/no-such-page'));
  sheet('not-found-vi', size, (page) => page.goto('/vi/no-such-page'));
  sheet('pre-launch-home', size, (page) => page.goto(`${preLaunchUrl}/`));
  sheet('home-try-line', size, async (page) => {
    await page.goto('/');
    await page.fill('#try-task', 'email the landlord');
    await page.click('[data-try-form] button');
    await page.locator('.try').scrollIntoViewIfNeeded();
  });
}
