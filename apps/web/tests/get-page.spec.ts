import { expect, test } from '@playwright/test';

import { qrCapacity, qrModules } from '../src/lib/qr-code';

import { workerUrl } from './playwright.config';
import { answerApi, notFound, wildMonster } from './shared-fixtures';

const made = {
  verdict: 'pass',
  result: 'monster',
  seed: 'dentist',
  bodyType: 'tooth',
  name: 'Molar, Keeper of Thursday',
  flavourText: 'Lives in the inbox. Pays no rent.',
  signature: 'signed-by-the-maker',
};

test.describe('catch it in the app', () => {
  test('on a phone, one button opens the app with the monster, and its link is there in plain text', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await answerApi(page, 'monster-page/molar-7f3k9x', wildMonster);
    await page.goto('/get?m=molar-7f3k9x');

    await expect(page.locator('[data-get-page]')).toHaveAttribute('data-state', 'found');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Molar, Keeper of Thursday is coming with you.',
    );
    await expect(page.getByRole('link', { name: 'Open in Scootch' })).toHaveAttribute(
      'data-app-link',
      'scootch-dev://m/molar-7f3k9x',
    );
    await expect(page.locator('[data-link]')).toHaveAttribute('href', /\/m\/molar-7f3k9x$/);
    await expect(page.locator('[data-qr]')).toBeHidden();
  });

  test('on a wide screen, the QR code of the monster’s link is the action, in the page’s language', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await answerApi(page, 'monster-page/molar-7f3k9x', wildMonster);
    await page.goto('/vi/get?m=molar-7f3k9x');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Molar, Keeper of Thursday sẽ đi cùng bạn.',
    );
    await expect(page.locator('[data-qr]')).toHaveAttribute(
      'src',
      '/get/qr.svg?m=molar-7f3k9x&lang=vi',
    );
    await expect(page.getByRole('link', { name: 'Mở trong Scootch' })).toBeHidden();
    await expect(page.locator('[data-link]')).toHaveAttribute('href', /\/vi\/m\/molar-7f3k9x$/);
  });

  test('with no monster it is the way to the App Store, on a phone and on a wide screen', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/get');
    await expect(page.locator('[data-get-page]')).toHaveAttribute('data-state', 'plain');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your monster is waiting.');
    await expect(page.getByRole('link', { name: 'Get it on the App Store' })).toBeVisible();

    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.getByRole('link', { name: 'Get it on the App Store' })).toBeHidden();
    await expect(
      page.getByRole('img', { name: 'A QR code that opens this page on your phone' }),
    ).toBeVisible();
  });

  test('a monster that was unshared gets the not-found page', async ({ page }) => {
    await answerApi(page, 'monster-page/gone-123456', notFound, 404);
    await page.goto('/get?m=gone-123456');
    await expect(page.locator('[data-get-page]')).toHaveAttribute('data-state', 'missing');
  });

  test('a monster’s own page sends "Catch it in the app" here with its id', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await answerApi(page, 'monster-page/molar-7f3k9x', wildMonster);
    await page.goto('/m/molar-7f3k9x');

    await expect(page.getByRole('link', { name: 'Catch it in the app' })).toHaveAttribute(
      'href',
      '/get?m=molar-7f3k9x',
    );
  });

  test('the maker gives the hatched monster a page and carries its id here', async ({ page }) => {
    const shared: unknown[] = [];
    await page.route('**/api/monster-make', (route) => route.fulfill({ json: made }));
    await page.route('**/api/monster-share', async (route) => {
      shared.push(route.request().postDataJSON());
      await route.fulfill({
        json: { verdict: 'pass', id: 'molar-7f3k9x', unshareToken: 'token-kept-by-the-browser' },
      });
    });
    await answerApi(page, 'monster-page/molar-7f3k9x', wildMonster);
    await page.goto('/');
    await page.getByRole('textbox').fill('the dentist email');
    await page.getByRole('textbox').press('Enter');
    await page.getByRole('checkbox', { name: 'Show what I typed' }).uncheck();

    await page.getByRole('link', { name: 'Catch it in the app' }).click();

    await expect(page).toHaveURL(/\/get\?m=molar-7f3k9x$/);
    // The typed line was hidden, so it never left the page.
    expect(shared).toHaveLength(1);
    expect(JSON.stringify(shared)).not.toContain('dentist email');
  });
});

test.describe('the QR code', () => {
  test('is served by the Worker as an SVG for a monster id, and for nothing else', async ({
    request,
  }) => {
    const code = await request.get(`${workerUrl}/get/qr.svg?m=molar-7f3k9x`);
    expect(code.status()).toBe(200);
    expect(code.headers()['content-type']).toBe('image/svg+xml');
    expect(await code.text()).toContain(`<title>${workerUrl}/m/molar-7f3k9x</title>`);

    for (const bad of ['', '?m=', '?m=../../etc', `?m=${'a'.repeat(41)}`]) {
      expect((await request.get(`${workerUrl}/get/qr.svg${bad}`)).status()).toBe(400);
    }
  });

  // The modules of "hi" as an independent reader (Core Image's QR detector) decoded them.
  const hi = [
    '#######..#..#.#######',
    '#.....#.#..#..#.....#',
    '#.###.#..#....#.###.#',
    '#.###.#.#..#..#.###.#',
    '#.###.#...###.#.###.#',
    '#.....#.###.#.#.....#',
    '#######.#.#.#.#######',
    '..........###........',
    '#####.####..##.#.#.#.',
    '#.#..#....#.#..#....#',
    '.#...###..##.#..####.',
    '####.#.#.......##.#..',
    '#.#.###..#.#.#..#.#.#',
    '........#.#####..#..#',
    '#######.#...#.##...#.',
    '#.....#..######..#..#',
    '#.###.#.#.#.#..#..#..',
    '#.###.#.##..#..#..#..',
    '#.###.#.#..#.#..###..',
    '#.....#.##.....##.#..',
    '#######.####.#..####.',
  ];

  test('encodes a text as the standard does, growing with it, and refuses one too long to fit', () => {
    const drawn = qrModules('hi').map((row) => row.map((dark) => (dark ? '#' : '.')).join(''));
    expect(drawn).toEqual(hi);

    expect(qrModules('https://scootch.app/m/molar-7f3k9x')).toHaveLength(29);
    expect(qrModules('x'.repeat(qrCapacity))).toHaveLength(37);
    expect(() => qrModules('x'.repeat(qrCapacity + 1))).toThrow();
  });
});
