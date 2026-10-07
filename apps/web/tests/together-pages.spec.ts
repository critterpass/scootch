import { expect, test, type Page } from '@playwright/test';

import { forOneReader, previewOf } from '../src/lib/shared-preview';

import { workerUrl } from './playwright.config';
import {
  answerApi,
  closedInvite,
  notFound,
  openInvite,
  sharedRecord,
  waitingHaunt,
} from './shared-fixtures';

const down = { error: { code: 'unavailable', message: 'Try again', retryable: true } };
const state = (page: Page, name: string) => page.locator(`[data-${name}-page]`);

test.describe('a table invite', () => {
  test('shows the table, a saved seat and the way to sit down', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await answerApi(page, 'table-invite/abcdefgh23', openInvite);
    await page.goto('/t/abcdefgh23');

    await expect(state(page, 'invite')).toHaveAttribute('data-state', 'open');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Priya saved you a seat.');
    await expect(page.locator('.eyebrow:visible')).toHaveText('3 here now');
    await expect(page.locator('[data-seats] li')).toHaveCount(4);
    await expect(page.locator('[data-seats] li').last()).toContainText('You?');
    await expect(page.getByRole('link', { name: 'Sit down' })).toBeVisible();
  });

  test('asks for the seats in the page’s own language, whatever the browser speaks', async ({
    page,
  }) => {
    const asked: string[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.pathname.startsWith('/api/table-invite/')) asked.push(url.search);
    });
    await answerApi(page, 'table-invite/abcdefgh23', openInvite);
    await page.goto('/vi/t/abcdefgh23');
    await expect(state(page, 'invite')).toHaveAttribute('data-state', 'open');
    await page.goto('/t/abcdefgh23');
    await expect(state(page, 'invite')).toHaveAttribute('data-state', 'open');

    expect(asked).toEqual(['?lang=vi', '?lang=en']);
  });

  test('shows a seat with a hidden name and label as someone, with no label', async ({ page }) => {
    await answerApi(page, 'table-invite/abcdefgh23', { ...openInvite, hostName: null });
    await page.goto('/t/abcdefgh23');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('A seat is saved for you.');
    const hidden = page.locator('[data-seats] li').nth(2);
    await expect(hidden.locator('strong')).toHaveText('Someone');
    await expect(hidden.locator('span').last()).toHaveText('');
  });

  test('says so when the table has closed, with another way in', async ({ page }) => {
    await answerApi(page, 'table-invite/abcdefgh23', closedInvite);
    await page.goto('/vi/t/abcdefgh23');

    await expect(state(page, 'invite')).toHaveAttribute('data-state', 'closed');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      /^Bàn của Priya đã đóng lúc \d\d:\d\d\.$/,
    );
    await expect(page.getByRole('link', { name: 'Ngồi xuống' })).toBeHidden();
    await expect(page.getByRole('link', { name: 'Trong lúc chờ, ấp một con quái' })).toBeVisible();
  });

  test('an unknown code is the not-found page, and an API that is down says so', async ({
    page,
  }) => {
    await answerApi(page, 'table-invite/gone234567', notFound, 404);
    await page.goto('/t/gone234567');
    await expect(state(page, 'invite')).toHaveAttribute('data-state', 'missing');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('This page got eaten.');

    await answerApi(page, 'table-invite/abcdefgh23', down, 503);
    await page.goto('/t/abcdefgh23');
    await expect(state(page, 'invite')).toHaveAttribute('data-state', 'offline');
    await expect(page.locator('[data-seats] li')).toHaveCount(0);
  });
});

test.describe('a haunt', () => {
  const haunt = 'haunt-page/abcdefgh234567ab';

  test('shows the monster, the sender and the preset dare, and shoos in one tap', async ({
    page,
  }) => {
    const shooed: string[] = [];
    await answerApi(page, haunt, waitingHaunt);
    await page.route(`**/api/${haunt}/shoo`, async (route) => {
      shooed.push(route.request().method());
      await route.fulfill({ json: { shooed: true } });
    });
    await page.goto('/h/abcdefgh234567ab');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Priya sent you a monster.');
    await expect(page.locator('[data-monster] svg')).toBeVisible();
    await expect(page.locator('[data-dare]')).toHaveText('Dare: “Two minutes on it?”');
    await expect(page.getByRole('link', { name: 'Catch it · 10 min' })).toBeVisible();

    await page.getByRole('button', { name: 'Shoo it' }).click();

    await expect(state(page, 'haunt')).toHaveAttribute('data-state', 'shooed');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Shooed.');
    await expect(page.locator('main')).toContainText('Nobody was told, not even Priya.');
    expect(shooed).toEqual(['POST']);
  });

  test('names nobody when it was sent without a name, and shows no words but a preset dare', async ({
    page,
  }) => {
    await answerApi(page, haunt, { ...waitingHaunt, from: null, dare: 'do your tax return' });
    await page.goto('/vi/h/abcdefgh234567ab');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Có người gửi cho bạn một con quái.',
    );
    await expect(page.locator('[data-dare]')).toBeHidden();
    await expect(page.locator('main')).not.toContainText('tax');
  });

  test('stays put when the shoo does not go through', async ({ page }) => {
    await answerApi(page, haunt, waitingHaunt);
    await answerApi(page, `${haunt}/shoo`, down, 503);
    await page.goto('/h/abcdefgh234567ab');

    await page.getByRole('button', { name: 'Shoo it' }).click();

    await expect(page.locator('[data-shoo-failed]')).toBeVisible();
    await expect(state(page, 'haunt')).toHaveAttribute('data-state', 'waiting');
    await expect(page.getByRole('button', { name: 'Shoo it' })).toBeEnabled();
  });

  test('one that was already caught or shooed has wandered off, and tells nothing more', async ({
    page,
  }) => {
    await answerApi(page, haunt, { ...waitingHaunt, state: 'gone' });
    await page.goto('/h/abcdefgh234567ab');

    await expect(state(page, 'haunt')).toHaveAttribute('data-state', 'gone');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('It wandered off.');
    await expect(page.locator('main')).not.toContainText('Priya');
    await expect(page.getByRole('button', { name: 'Shoo it' })).toBeHidden();
  });

  test('an unknown id is the not-found page, and an API that is down says so', async ({ page }) => {
    await answerApi(page, 'haunt-page/gone', notFound, 404);
    await page.goto('/h/gone');
    await expect(state(page, 'haunt')).toHaveAttribute('data-state', 'missing');

    await answerApi(page, haunt, down, 503);
    await page.goto('/h/abcdefgh234567ab');
    await expect(state(page, 'haunt')).toHaveAttribute('data-state', 'offline');
  });
});

test.describe('a shared record', () => {
  test('shows the week’s name, its band and a track for each finished day', async ({ page }) => {
    await answerApi(page, 'shared-record/bin-bags', sharedRecord);
    await page.goto('/r/bin-bags');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Molar and the Bin Bags');
    await expect(page.locator('[data-eyebrow]')).toHaveText('Priya’s week · 5–11 October');
    await expect(page.locator('[data-band]')).toHaveText('7 bars · full band');
    await expect(page.locator('[data-tracks] li')).toHaveCount(7);
    await expect(page.locator('[data-tracks] li').first()).toContainText('Mon');
    await expect(page.locator('[data-bars] span')).toHaveCount(7);
    await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
  });

  test('a week with fewer days is a smaller band, and a hidden name is not shown', async ({
    page,
  }) => {
    const short = { ...sharedRecord, sharerName: null, tracks: sharedRecord.tracks.slice(0, 2) };
    await answerApi(page, 'shared-record/bin-bags', short);
    await page.goto('/vi/r/bin-bags');

    await expect(page.locator('[data-band]')).toHaveText('2 ô nhịp · ban nhạc nhỏ hơn');
    await expect(page.locator('[data-eyebrow]')).toHaveText(/^Một tuần · /);
    await expect(page.locator('main')).not.toContainText('Priya');
  });

  test('an unknown id is the not-found page, and an API that is down says so', async ({ page }) => {
    await answerApi(page, 'shared-record/gone', notFound, 404);
    await page.goto('/r/gone');
    await expect(state(page, 'record')).toHaveAttribute('data-state', 'missing');
    await expect(page.locator('[data-ask]')).toBeHidden();

    await answerApi(page, 'shared-record/bin-bags', down, 503);
    await page.goto('/r/bin-bags');
    await expect(state(page, 'record')).toHaveAttribute('data-state', 'offline');
  });
});

test.describe('link previews', () => {
  const page = new URL('https://scootch.app/t/abcdefgh23');

  test('an invite and a haunt say who only when a name was shared, and nothing once over', () => {
    expect(previewOf('t', openInvite, page, 'en')?.title).toBe('Priya saved you a seat.');
    expect(previewOf('t', { ...openInvite, hostName: null }, page, 'en')?.title).toBe(
      'A seat is saved for you.',
    );
    expect(previewOf('t', closedInvite, page, 'en')).toBeNull();
    expect(previewOf('h', waitingHaunt, page, 'vi')?.title).toBe('Priya gửi cho bạn một con quái.');
    expect(previewOf('h', { ...waitingHaunt, from: null }, page, 'en')?.title).toBe(
      'Someone sent you a monster.',
    );
    expect(previewOf('h', { ...waitingHaunt, state: 'gone' }, page, 'en')).toBeNull();
    // Seat names and labels never reach a preview.
    expect(JSON.stringify(previewOf('t', openInvite, page, 'en'))).not.toContain('Dana');
    expect(forOneReader('t') && forOneReader('h')).toBe(true);
    expect(forOneReader('r') || forOneReader('m')).toBe(false);
  });

  test('a record is previewed by its name', () => {
    expect(previewOf('r', sharedRecord, page, 'en')).toMatchObject({
      title: 'Molar and the Bin Bags',
      description: 'A week, as a record. 15 seconds. Press play.',
    });
    expect(previewOf('r', {}, page, 'en')).toBeNull();
  });
});

// The bundled site in the Workers runtime, routed as it is when deployed.
test.describe('addresses with and without a trailing slash', () => {
  const plain = ['privacy', 'terms', 'support', 'helplines', 'what-scootch-is', 'press', 'plus'];

  for (const path of [...plain.flatMap((name) => [`/${name}`, `/vi/${name}`]), '/vi', '/android']) {
    test(`${path} answers in both forms`, async ({ request }) => {
      const bare = await request.get(`${workerUrl}${path}`);
      const slashed = await request.get(`${workerUrl}${path}/`);

      expect(bare.status()).toBe(200);
      expect(slashed.status()).toBe(200);
      expect(await bare.text()).toBe(await slashed.text());
    });
  }

  for (const path of [
    '/t/abcdefgh23',
    '/vi/h/abcdefgh234567ab',
    '/r/bin-bags',
    '/m/molar-7f3k9x',
  ]) {
    test(`${path} reaches its page in both forms`, async ({ request }) => {
      const bare = await request.get(`${workerUrl}${path}`);
      const slashed = await request.get(`${workerUrl}${path}/`);

      expect(slashed.status()).toBe(bare.status());
      expect(await bare.text()).toContain('data-state="loading"');
      expect(await slashed.text()).toBe(await bare.text());
    });
  }
});

test.describe('the way into the app', () => {
  test('the association file is JSON at Apple’s address, with no redirect, for both apps and every link path', async ({
    request,
  }) => {
    const response = await request.get(`${workerUrl}/.well-known/apple-app-site-association`, {
      maxRedirects: 0,
    });

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toBe('application/json');
    const file = (await response.json()) as {
      applinks: { details: { appIDs: string[]; components: { '/': string }[] }[] };
      appclips: { apps: string[] };
    };
    const [links] = file.applinks.details;
    expect(links?.appIDs).toEqual(['YFND2EEW8S.app.scootch', 'YFND2EEW8S.app.scootch.dev']);
    const paths = links?.components.map((component) => component['/']) ?? [];
    for (const kind of ['t', 'f', 'h', 'm', 'c', 's', 'r']) {
      expect(paths).toContain(`/${kind}/*`);
      expect(paths).toContain(`/vi/${kind}/*`);
    }
    expect(file.appclips.apps).toEqual([
      'YFND2EEW8S.app.scootch.Clip',
      'YFND2EEW8S.app.scootch.dev.Clip',
    ]);
  });

  test('an invite’s button opens the app with the code, and the code can be copied to paste by hand', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.setViewportSize({ width: 390, height: 844 });
    await answerApi(page, 'table-invite/abcdefgh23', openInvite);
    await page.goto('/t/abcdefgh23');

    await expect(page.getByRole('link', { name: 'Sit down' })).toHaveAttribute(
      'data-app-link',
      'scootch-dev://t/abcdefgh23',
    );
    await expect(page.locator('[data-code]:visible')).toHaveText('abcdefgh23');
    await expect(page.locator('main')).toContainText(
      'paste it in Scootch, under “Sit with someone”',
    );
    await page.getByRole('button', { name: 'Copy code' }).click();
    await expect(page.locator('[data-copied]:visible')).toHaveText('Copied.');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('abcdefgh23');
  });

  test('a haunt’s catch button carries the haunt into the app', async ({ page }) => {
    await answerApi(page, 'haunt-page/abcdefgh234567ab', waitingHaunt);
    await page.goto('/h/abcdefgh234567ab');

    await expect(page.getByRole('link', { name: 'Catch it · 10 min' })).toHaveAttribute(
      'data-app-link',
      'scootch-dev://h/abcdefgh234567ab',
    );
  });
});

test.describe('a friend link', () => {
  const state = (page: Page) => page.locator('[data-friend-page]');

  test('says who it is from and opens the app with the code, in both languages', async ({
    page,
  }) => {
    await answerApi(page, 'friend-invite/abcdefgh23', { state: 'valid', fromName: 'Kofi' });
    await page.goto('/f/abcdefgh23');

    await expect(state(page)).toHaveAttribute('data-state', 'valid');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Kofi wants to sit with you.');
    await expect(page.getByRole('link', { name: 'Be friends in Scootch' })).toHaveAttribute(
      'data-app-link',
      'scootch-dev://f/abcdefgh23',
    );
    await expect(page.locator('[data-code]:visible')).toHaveText('abcdefgh23');

    await page.goto('/vi/f/abcdefgh23');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Kofi muốn ngồi cùng bạn.');
    await expect(page.getByRole('link', { name: 'Kết bạn trong Scootch' })).toBeVisible();
  });

  test('one that was used or has run out says so and names nobody', async ({ page }) => {
    await answerApi(page, 'friend-invite/abcdefgh23', { state: 'gone', fromName: null });
    await page.goto('/f/abcdefgh23');

    await expect(state(page)).toHaveAttribute('data-state', 'gone');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('This link has been used up.');
    await expect(page.locator('[data-code]:visible')).toHaveCount(0);
  });

  test('an unknown code is the not-found page, and an API that is down says so', async ({
    page,
  }) => {
    await answerApi(page, 'friend-invite/gone234567', notFound, 404);
    await page.goto('/f/gone234567');
    await expect(state(page)).toHaveAttribute('data-state', 'missing');

    await answerApi(page, 'friend-invite/abcdefgh23', down, 503);
    await page.goto('/f/abcdefgh23');
    await expect(state(page)).toHaveAttribute('data-state', 'offline');
  });
});
