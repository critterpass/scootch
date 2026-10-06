import { expect, test, type Page } from '@playwright/test';

const monster = {
  verdict: 'pass',
  result: 'monster',
  seed: 'dentist',
  bodyType: 'tooth',
  name: 'Molar, Keeper of Thursday',
  flavourText: 'Lives in the inbox. Pays no rent.',
};

type Sent = { text: string; language: string };

/** Answers the maker's one request at the network boundary and records what the page sent. */
async function answerWith(page: Page, answer: unknown, status = 200): Promise<Sent[]> {
  const sent: Sent[] = [];
  await page.route('**/api/monster-make', async (route) => {
    sent.push(route.request().postDataJSON() as Sent);
    await route.fulfill({ status, json: answer });
  });
  return sent;
}

async function hatch(page: Page, text: string): Promise<void> {
  await page.getByRole('textbox').fill(text);
  await page.getByRole('textbox').press('Enter');
}

test('an empty field asks for one word and sends nothing', async ({ page }) => {
  const sent = await answerWith(page, monster);
  await page.goto('/');

  await page.getByRole('button', { name: 'Hatch it' }).click();

  await expect(page.getByRole('alert')).toHaveText('Type anything. Even one word.');
  expect(sent).toEqual([]);
});

test('a hatched monster appears in place, and the toggle takes the typed line off the card', async ({
  page,
}) => {
  const sent = await answerWith(page, monster);
  await page.goto('/');

  await hatch(page, 'the dentist email');
  await expect(page.getByRole('status')).toContainText('Hatching');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Meet Molar, Keeper of Thursday.',
  );
  expect(sent).toEqual([{ text: 'the dentist email', language: 'en' }]);
  const card = page.locator('[data-card]');
  await expect(card.locator('svg')).toBeVisible();
  await expect(card).toContainText('“the dentist email”');
  await expect(page.getByRole('link', { name: 'Catch it in the app' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save card' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Hatch another' })).toBeVisible();

  await page.getByRole('checkbox', { name: 'Show what I typed' }).uncheck();

  await expect(card).not.toContainText('the dentist email');
  await expect(card).toContainText('Molar, Keeper of Thursday');
  await expect(page.getByText('Hidden. The card just says WILD.')).toBeVisible();
});

test('a serious text shows helplines and no monster, and drops what was typed', async ({
  page,
}) => {
  await answerWith(page, { verdict: 'crisis' });
  await page.goto('/');

  await hatch(page, 'a heavy thing');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'That sounds really heavy. I won’t make a monster out of it.',
  );
  await expect(page.locator('main').getByRole('link', { name: /helpline/i })).toBeVisible();
  await expect(page.locator('[data-card]')).toBeHidden();
  await expect(page.locator('[data-card] svg')).toHaveCount(0);
  await expect(page.getByRole('textbox')).toBeHidden();
  await expect(page.locator('main')).not.toContainText('a heavy thing');
});

test('offline keeps what was typed and offers one way on', async ({ page }) => {
  await page.route('**/api/monster-make', (route) => route.abort('internetdisconnected'));
  await page.goto('/vi/');

  await hatch(page, 'đi tập gym');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Mất sóng rồi. Lò ấp của tui chạy bằng wifi.',
  );
  await expect(page.getByRole('textbox')).toHaveValue('đi tập gym');
  await expect(page.getByRole('button', { name: 'Thử lại' })).toBeVisible();
});

test('the nap after too many tries is a state, not an error', async ({ page }) => {
  const napping = { error: { code: 'rate_limited', message: 'Napping', retryable: true } };
  await answerWith(page, napping, 429);
  await page.goto('/');

  await hatch(page, 'my taxes');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Twelve monsters. I need a lie down.',
  );
});
