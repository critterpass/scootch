import { expect, test, type Browser } from '@playwright/test';

import { HELPLINES, dialLink, textLink } from '@scootch/i18n';

const PATHS = ['/helplines', '/vi/helplines'];
const DIRECTORY = 'https://findahelpline.com';

/** The page as a reader far from Vietnam sees it at an instant: the phone's zone must not matter. */
async function pageAt(browser: Browser, instant: string, path: string) {
  const context = await browser.newContext({ timezoneId: 'America/Los_Angeles' });
  const page = await context.newPage();
  await page.clock.setFixedTime(new Date(instant));
  await page.goto(path);
  return page;
}

const vietnamLinks = (page: Awaited<ReturnType<typeof pageAt>>) =>
  page
    .locator('li[data-country="VN"] a, li[data-country="VN"] ~ li:not([data-line]) a')
    .evaluateAll((links) => links.slice(0, 5).map((link) => link.getAttribute('href')));
const closedNumbers = (page: Awaited<ReturnType<typeof pageAt>>) =>
  page
    .locator('li[data-closed] a')
    .evaluateAll((links) => links.map((link) => link.getAttribute('href')));

test('Vietnam is the emergency number, then the table, then the directory when all are open', async ({
  browser,
}) => {
  for (const path of PATHS) {
    // Wednesday 17:00 in Vietnam.
    const page = await pageAt(browser, '2026-10-07T17:00:00+07:00', path);
    expect(await vietnamLinks(page)).toEqual([
      'tel:115',
      'tel:0963061414',
      'tel:0865044400',
      'tel:111',
      DIRECTORY,
    ]);
    expect(await closedNumbers(page)).toEqual([]);
    await page.context().close();
  }
});

test('a closed line says so, moves below the open ones and can still be called', async ({
  browser,
}) => {
  for (const path of PATHS) {
    // Monday 14:00 in Vietnam: Ngày mai does not answer on Mondays, HOPE opens at 16:30.
    const page = await pageAt(browser, '2026-10-05T14:00:00+07:00', path);
    expect(await vietnamLinks(page)).toEqual([
      'tel:115',
      'tel:111',
      'tel:0963061414',
      'tel:0865044400',
      DIRECTORY,
    ]);
    expect(await closedNumbers(page)).toEqual(['tel:0963061414', 'tel:0865044400']);
    for (const closed of await page.locator('li[data-closed]').all()) {
      await expect(closed.getByRole('link')).toBeVisible();
      // The closed words are the hours and something more.
      const open = (await closed.getAttribute('data-open-detail')) ?? '';
      const shown = (await closed.locator('[data-detail]').textContent()) ?? '';
      expect(shown.trim()).toContain(open);
      expect(shown.trim()).not.toBe(open);
    }
    await page.context().close();
  }
});

test('every line of the table is on the page, and every call or text link is its digits', async ({
  page,
}) => {
  const fromTheTable = HELPLINES.flatMap((line) => [dialLink(line), textLink(line)])
    .filter((link) => link !== null)
    .sort();
  for (const path of PATHS) {
    await page.goto(path);
    const onThePage = await page
      .locator('main a[href^="tel:"], main a[href^="sms:"]')
      .evaluateAll((links) => links.map((link) => link.getAttribute('href')));
    expect(onThePage.sort()).toEqual(fromTheTable);
    for (const link of onThePage) expect(link).toMatch(/^(tel|sms):\d+$/);
    // Every row tells its hours.
    for (const row of await page.locator('li[data-line]').all()) {
      await expect(row.locator('[data-detail]')).not.toBeEmpty();
    }
  }
});
