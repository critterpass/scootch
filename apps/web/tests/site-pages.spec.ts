import { expect, test } from '@playwright/test';

import { chalkLines } from '../src/copy/chalk-lines';
import { en } from '../src/copy/en';
import { vi } from '../src/copy/vi';
import { preLaunchUrl } from './playwright.config';

const pages = ['/', '/tuition', '/privacy', '/terms', '/support', '/helplines'];
const both = pages.flatMap((path) => [path, path === '/' ? '/vi/' : `/vi${path}`]);

for (const path of both) {
  test(`${path} renders in its own language, and fits a 375 px phone`, async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width: 375, height: 800 } });
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    expect(await page.locator('html').getAttribute('lang')).toBe(
      path.startsWith('/vi') ? 'vi' : 'en',
    );
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toBeVisible();
    const wide = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(wide).toBeLessThanOrEqual(375);
    await page.close();
  });
}

test('the language switch leads to the same page in the other language, and back', async ({
  page,
}) => {
  await page.goto('/tuition');
  await page.locator('[data-language-switch]').click();
  await expect(page).toHaveURL(/\/vi\/tuition\/?$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
  await expect(page.locator('h1')).toHaveText(vi.tuitionPage.headline);
  await page.locator('[data-language-switch]').click();
  await expect(page).toHaveURL(/\/tuition\/?$/);
  await expect(page.locator('h1')).toHaveText(en.tuitionPage.headline);
});

test('an address that matches nothing is answered in the language of its path', async ({
  page,
}) => {
  await page.goto('/no-such-page');
  await expect(page.locator('h1:visible')).toContainText(en.notFound.line);
  await page.goto('/vi/no-such-page');
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
  await expect(page.locator('h1:visible')).toContainText(vi.notFound.line);
});

test('before launch there is no way into the store, only “coming soon”', async ({ page }) => {
  for (const [path, words] of [
    ['/', en.badge.comingSoon],
    ['/vi/', vi.badge.comingSoon],
  ] as const) {
    await page.goto(`${preLaunchUrl}${path}`);
    await expect(page.locator('[data-coming-soon]').first()).toHaveText(words);
    await expect(page.locator('a[href*="apps.apple.com"]')).toHaveCount(0);
  }
});

test('the chalkboard answers a task with one of his lines', async ({ page }) => {
  await page.goto('/');
  await page.fill('#try-task', 'email the landlord');
  await page.click('[data-try-form] button');
  await expect(page.locator('[data-try-task]')).toHaveText('email the landlord');
  const email = chalkLines.en.kinds[0]?.lines ?? [];
  expect(email).toContain(await page.locator('[data-try-line]').textContent());
});

test('the chalkboard never jokes about a crisis: no teacher, only the way to a helpline', async ({
  page,
}) => {
  for (const [path, text] of [
    ['/', 'I want to kill myself'],
    ['/vi/', 'tôi muốn tự tử'],
  ] as const) {
    await page.goto(path);
    await page.fill('#try-task', text);
    await page.click('[data-try-form] button');
    await expect(page.locator('[data-try-care]')).toBeVisible();
    await expect(page.locator('[data-try-reply]')).toBeHidden();
    await expect(page.locator('[data-try-care] a')).toHaveAttribute(
      'href',
      path === '/' ? '/helplines' : '/vi/helplines',
    );
  }
});

test('his lines on the site never use a word he never uses', () => {
  const banned = {
    en: /\b(lazy|failed|fail|stupid|disappointed|behind|missed|again|finally|streaks?|absent)\b/i,
    vi: /(?<!\p{L})(lười|thất bại|ngu|thất vọng|bỏ lỡ|cuối cùng thì|chuỗi ngày|vắng mặt)(?!\p{L})/iu,
  };
  const his = {
    en: [
      ...chalkLines.en.kinds.flatMap((kind) => kind.lines),
      ...chalkLines.en.general,
      ...en.home.loop.fuse.steps.map((step) => step.line),
      ...en.home.never.happenings.map((item) => item.line),
      en.home.hero.line,
      en.home.loop.pick.line,
      en.notFound.line,
      en.home.tryIt.empty,
    ],
    vi: [
      ...chalkLines.vi.kinds.flatMap((kind) => kind.lines),
      ...chalkLines.vi.general,
      ...vi.home.loop.fuse.steps.map((step) => step.line),
      ...vi.home.never.happenings.map((item) => item.line),
      vi.home.hero.line,
      vi.home.loop.pick.line,
      vi.notFound.line,
      vi.home.tryIt.empty,
    ],
  };
  for (const language of ['en', 'vi'] as const) {
    for (const line of his[language]) expect(line, line).not.toMatch(banned[language]);
  }
});
