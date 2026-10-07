import { expect, test, type Page } from '@playwright/test';

import { preLaunchUrl } from './playwright.config';
import { answerApi, caughtMonster, notFound, sharedCard, wildMonster } from './shared-fixtures';

const maker = {
  verdict: 'pass',
  result: 'monster',
  seed: 'dentist',
  bodyType: 'tooth',
  name: 'Molar, Keeper of Thursday',
  flavourText: 'Lives in the inbox. Pays no rent.',
  signature: 'signed-by-the-maker',
};

test('a wild monster’s page shows its card, its status and both ways on', async ({ page }) => {
  await answerApi(page, 'monster-page/molar-7f3k9x', wildMonster);
  await page.goto('/m/molar-7f3k9x');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Molar, Keeper of Thursday');
  const card = page.locator('[data-card]');
  await expect(card.locator('svg')).toBeVisible();
  await expect(card).toContainText('Wild');
  await expect(card).toContainText('Not caught yet');
  await expect(page.locator('[data-facts]')).toContainText('StatusWild');
  await expect(page.getByRole('link', { name: 'Make your own' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Catch it in the app' })).toBeVisible();
  // Nobody shared this one from this browser, so nobody here may unshare it.
  await expect(page.getByRole('button', { name: 'Unshare' })).toBeHidden();
});

test('a caught monster’s page says caught, when, and how long it took', async ({ page }) => {
  await answerApi(page, 'monster-page/molar-7f3k9x', caughtMonster);
  await page.goto('/m/molar-7f3k9x');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Molar, Keeper of Thursday');
  await expect(page.locator('[data-card]')).toContainText('Caught in 9 min');
  const facts = page.locator('[data-facts]');
  await expect(facts).toContainText('StatusCaught');
  await expect(facts).toContainText('6 Oct');
  await expect(facts).toContainText('It took9 min');
  await expect(page.getByRole('link', { name: 'Catch it in the app' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Get Scootch' })).toBeVisible();
});

test('an unknown or unshared id shows the not-found monster', async ({ page }) => {
  await answerApi(page, 'monster-page/gone-000000', notFound, 404);
  await page.goto('/vi/m/gone-000000');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Trang này bị ăn mất rồi.');
  await expect(page.locator('main')).toContainText('Lạc Lối, Kẻ Ăn Trang');
  await expect(page.locator('[data-card]')).toBeHidden();
});

test('the monster shared from this browser can be unshared from its page', async ({ page }) => {
  let unsharedWith: string | undefined;
  await answerApi(page, 'monster-page/molar-7f3k9x', wildMonster);
  await page.route('**/api/monster-share/molar-7f3k9x', async (route) => {
    unsharedWith = (await route.request().headerValue('authorization')) ?? undefined;
    await route.fulfill({ json: { unshared: true } });
  });
  await page.addInitScript(() => {
    localStorage.setItem('scootch.shares', JSON.stringify({ 'molar-7f3k9x': 'the-token' }));
  });
  await page.goto('/m/molar-7f3k9x');

  await page.getByRole('button', { name: 'Unshare' }).click();

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('This page got eaten.');
  expect(unsharedWith).toBe('Bearer the-token');
});

test('sharing from the maker sends the maker’s signature, and the typed line only while the toggle is on', async ({
  page,
}) => {
  const sent: Record<string, unknown>[] = [];
  await answerApi(page, 'monster-make', maker);
  await page.route('**/api/monster-share', async (route) => {
    sent.push(route.request().postDataJSON() as Record<string, unknown>);
    await route.fulfill({
      json: { verdict: 'pass', id: `molar-${sent.length}`, unshareToken: 't' },
    });
  });
  await page.route('**/api/monster-share/*', (route) =>
    route.fulfill({ json: { unshared: true } }),
  );
  await page.goto('/');
  await page.getByRole('textbox').fill('the dentist email');
  await page.getByRole('textbox').press('Enter');
  await expect(page.getByRole('button', { name: 'Share' })).toBeVisible();

  await page.getByRole('checkbox', { name: 'Show what I typed' }).uncheck();
  await page.getByRole('button', { name: 'Share' }).click();
  await expect(page.locator('[data-share-status] a')).toHaveAttribute('href', '/m/molar-1');

  expect(sent).toHaveLength(1);
  expect(sent[0]).toMatchObject({
    name: maker.name,
    flavourText: maker.flavourText,
    seed: 'dentist',
    language: 'en',
    signature: maker.signature,
  });
  expect(JSON.stringify(sent[0])).not.toContain('dentist email');
});

test('before launch, a hatched monster gets one email field and no App Store badge', async ({
  page,
}) => {
  const listed: Record<string, unknown>[] = [];
  await answerApi(page, 'monster-make', maker);
  await answerApi(page, 'monster-share', {
    verdict: 'pass',
    id: 'molar-7f3k9x',
    unshareToken: 't',
  });
  await page.route('**/api/waitlist', async (route) => {
    listed.push(route.request().postDataJSON() as Record<string, unknown>);
    await route.fulfill({ json: { listed: true } });
  });
  await page.goto(`${preLaunchUrl}/`);

  await expect(page.locator('.app-store-badge')).toHaveCount(0);
  await expect(page.locator('a[href*="apps.apple.com"]')).toHaveCount(0);
  await expect(page.getByText('Coming soon to iPhone').first()).toBeVisible();

  await page.getByRole('textbox').fill('the dentist email');
  await page.getByRole('textbox').press('Enter');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Meet Molar, Keeper of Thursday.',
  );
  await expect(page.getByRole('link', { name: 'Catch it in the app' })).toHaveCount(0);

  const email = page.getByRole('textbox', { name: 'Your email' });
  await email.fill('not an email');
  await page.getByRole('button', { name: 'Tell me when it’s out' }).click();
  await expect(page.locator('[data-waitlist-error]')).toHaveText(/doesn’t look like an email/);
  expect(listed).toEqual([]);

  await email.fill('priya@example.com');
  await page.getByRole('button', { name: 'Tell me when it’s out' }).click();

  await expect(page.getByText('Done. I’ll keep Molar safe until launch day.')).toBeVisible();
  expect(listed).toEqual([
    { email: 'priya@example.com', language: 'en', platform: 'ios', monsterId: 'molar-7f3k9x' },
  ]);
});

test('the helplines page has no critter on it, in either language', async ({ page }) => {
  for (const path of ['/helplines', '/vi/helplines']) {
    await page.goto(path);
    await expect(page.getByRole('link', { name: /988/ }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /115/ })).toBeVisible();
    await expect(page.locator('.drawing, .card, .blob, [data-card]')).toHaveCount(0);
    await expect(page.locator('main svg')).toHaveCount(0);
  }
});

test.describe('the caught card', () => {
  const tilt = async (page: Page) => {
    await answerApi(page, 'shared-card/molar-041', sharedCard);
    await page.goto('/c/molar-041');
    const card = page.locator('[data-tilt]');
    await expect(card.locator('svg')).toBeVisible();
    const box = await card.boundingBox();
    if (!box) throw new Error('the card has no box');
    await page.mouse.move(box.x + box.width * 0.85, box.y + box.height * 0.2);
    return card;
  };

  test('tilts towards the pointer, and shows only what the sharer chose', async ({ page }) => {
    const card = await tilt(page);

    await expect(card).toHaveAttribute('style', /rotateY\(/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Molar is home.');
    await expect(page.locator('main')).toContainText('Only what Priya chose to show.');
    // The task was hidden by the sharer: the page has no row for it.
    await expect(page.locator('[data-facts]')).not.toContainText('It was');
    await expect(page.getByRole('link', { name: 'Make your own monster' })).toBeVisible();
  });

  test('stays still with Reduce Motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const card = await tilt(page);

    await expect(card).toHaveAttribute('data-tilt', 'off');
    await expect(card).not.toHaveAttribute('style', /rotate/);
    await expect(page.getByText('Move your pointer over the card to tilt it.')).toBeHidden();
  });
});
