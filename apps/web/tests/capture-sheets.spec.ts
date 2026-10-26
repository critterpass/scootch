import { test, type Page } from '@playwright/test';

import { preLaunchUrl } from './playwright.config';

// Sheets of every page, for looking at beside the design. Runs only when CAPTURE_DIR names a
// folder to write into.
const out = process.env['CAPTURE_DIR'] ?? '';
test.skip(out === '', 'CAPTURE_DIR is not set');

const sizes = { desktop: { width: 1440, height: 900 }, phone: { width: 390, height: 844 } };

/** One page in one size. */
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
  for (const scheme of ['light', 'dark'] as const) {
    for (const language of ['en', 'vi']) {
      sheet(`home-${scheme}-${language}`, size, async (page) => {
        await page.emulateMedia({ colorScheme: scheme });
        await page.goto(language === 'en' ? '/' : '/vi/');
      });
    }
  }
  for (const plain of ['privacy', 'terms', 'support', 'helplines', 'help']) {
    sheet(plain, size, (page) => page.goto(`/${plain}`).then(() => undefined));
    sheet(`${plain}-vi`, size, (page) => page.goto(`/vi/${plain}`).then(() => undefined));
  }
  sheet('no-such-page', size, (page) => page.goto('/no-such-page').then(() => undefined));
  sheet('pre-launch-home', size, (page) => page.goto(`${preLaunchUrl}/`).then(() => undefined));
}
