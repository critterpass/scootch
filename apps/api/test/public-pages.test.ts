import {
  createExecutionContext,
  runDurableObjectAlarm,
  waitOnExecutionContext,
} from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { closedInvite, openInvite, waitingHaunt } from '../../web/tests/shared-fixtures';
import { createApp } from '../src/app';
import {
  hauntPageSchema,
  hauntPageShooResponseSchema,
  sendHauntResponseSchema,
  tableInvitePageSchema,
  tableInviteResponseSchema,
  type HauntPage,
  type TableInvitePage,
} from '../src/contracts';
import * as routes from '../src/routes/index.generated';
import { tableStub } from '../src/tables/tables';

import { freshIp, wireErrorOf } from './support';
import {
  as,
  befriend,
  count,
  inviteCode,
  ok,
  openTable,
  person,
  sitDown,
  until,
  type Person,
} from './table-support';

const minute = 60_000;
const day = 24 * 60 * minute;

afterEach(() => {
  vi.useRealTimers();
});

/** One request as a website visitor: no device token, only an address and a browser's language. */
async function visit(
  path: string,
  { method = 'GET', ip = freshIp(), language = 'en-GB,en;q=0.9' } = {},
): Promise<Response> {
  const ctx = createExecutionContext();
  const response = await createApp(Object.values(routes)).fetch(
    new Request(`https://api.test${path}`, {
      method,
      headers: { 'CF-Connecting-IP': ip, 'Accept-Language': language },
    }),
    env,
    ctx,
  );
  await waitOnExecutionContext(ctx);
  return response;
}

async function notFound(response: Response | Promise<Response>): Promise<void> {
  const settled = await response;
  expect(settled.status).toBe(404);
  expect(await wireErrorOf(settled)).toMatchObject({ code: 'not_found', retryable: false });
}

const invitePage = async (code: string, language?: string) =>
  tableInvitePageSchema.parse(
    await ok(visit(`/v1/table-invite/${code}`, language === undefined ? {} : { language })),
  );

describe('the table invite page', () => {
  it('shows a stranger the host and the seats, and nothing a seat hid', async () => {
    const [host, writer, hider] = [await person('Mai'), await person('Bo'), await person('Cy')];
    const { tableId, seat } = await openTable(host, '?mode=paperwork');
    const made = tableInviteResponseSchema.parse(
      await ok(as(host, 'POST', `/v1/tables/${tableId}/invites`)),
    );
    await sitDown(writer, made.code, tableId, '?mode=writing');
    await sitDown(hider, made.code, tableId, '?mode=money&hidden=1');
    await until(() => seat.state.seats.length === 3, 'three seats');

    const answer = await visit(`/v1/table-invite/${made.code}`);
    const text = await answer.clone().text();
    const page = tableInvitePageSchema.parse(await answer.json());

    expect(page).toEqual({
      state: 'open',
      hostName: 'Mai',
      closedAt: null,
      seats: [
        { name: 'Mai', label: 'admin', workMode: 'paperwork' },
        { name: 'Bo', label: 'writing', workMode: 'writing' },
        { name: 'Cy', label: null, workMode: null },
      ],
    } satisfies TableInvitePage);
    expect(answer.headers.get('Cache-Control')).toBe('private, no-store');
    for (const secret of [host, writer, hider].map((each) => each.accountId)) {
      expect(text).not.toContain(secret);
    }
    expect(text).not.toContain(tableId);
    expect(text).not.toContain('money');
    expect(text).not.toContain('busy');

    // A reader whose browser asks for Vietnamese gets the labels in Vietnamese.
    const vietnamese = await invitePage(made.code, 'vi-VN,vi;q=0.9,en;q=0.8');
    expect(vietnamese.seats.map((each) => each.label)).toEqual(['giấy tờ', 'viết lách', null]);

    // The page's own language wins over the browser's, both ways.
    const viPage = tableInvitePageSchema.parse(
      await ok(visit(`/v1/table-invite/${made.code}?lang=vi`)),
    );
    expect(viPage.seats.map((each) => each.label)).toEqual(['giấy tờ', 'viết lách', null]);
    const enPage = tableInvitePageSchema.parse(
      await ok(visit(`/v1/table-invite/${made.code}?lang=en`, { language: 'vi-VN,vi;q=0.9' })),
    );
    expect(enPage.seats.map((each) => each.label)).toEqual(['admin', 'writing', null]);
  });

  it('has no field that could hold a task, an id or a hidden seat’s work', async () => {
    const host = await person('Mai');
    const { tableId } = await openTable(host, '?mode=email&hidden=1');
    const page = await invitePage(await inviteCode(host, tableId));

    expect(Object.keys(page).sort()).toEqual(['closedAt', 'hostName', 'seats', 'state']);
    expect(page.seats).toEqual([{ name: 'Mai', label: null, workMode: null }]);
    // Reading the page changed nothing at the table: the host is still its only seat.
    expect(await count('table_seats WHERE table_id = ?', tableId)).toBe(1);
  });

  it('says closed, with no seats, once the table has closed', async () => {
    const host = await person('Mai');
    const { tableId, seat } = await openTable(host, '?mode=email');
    const code = await inviteCode(host, tableId);
    seat.send({ type: 'leave' });
    await until(() => seat.closed !== undefined, 'the host to leave');
    vi.useFakeTimers({ toFake: ['Date'], now: Date.now() + 11 * minute });
    await runDurableObjectAlarm(tableStub(env, tableId));

    const page = await invitePage(code);

    expect(page).toMatchObject({ state: 'closed', hostName: 'Mai', seats: [] });
    expect(page.closedAt).not.toBeNull();
  });

  it('says closed, with no seats, once the link has run out, and forgets it a week later', async () => {
    const host = await person('Mai');
    const { tableId } = await openTable(host, '?mode=email');
    const code = await inviteCode(host, tableId);

    vi.useFakeTimers({ toFake: ['Date'], now: Date.now() + day + minute });
    expect(await invitePage(code)).toEqual({
      state: 'closed',
      hostName: 'Mai',
      closedAt: null,
      seats: [],
    });

    vi.useFakeTimers({ toFake: ['Date'], now: Date.now() + 8 * day });
    const later = await person('Bo');
    const { tableId: laterTable } = await openTable(later);
    await inviteCode(later, laterTable);
    await notFound(visit(`/v1/table-invite/${code}`));
  });

  it('answers an unknown code, and anything that is not a code, as not found', async () => {
    await notFound(visit('/v1/table-invite/abcdefgh23'));
    await notFound(visit('/v1/table-invite/NOT-A-CODE'));
    // A friend code is not a table code.
    const host = await person('Mai');
    const friendCode = (await ok<{ code: string }>(as(host, 'POST', '/v1/friends/invites'))).code;
    await notFound(visit(`/v1/table-invite/${friendCode}`));
  });
});

const sendBody = (to: Person, extra: Record<string, unknown> = {}) => ({
  to: to.accountId,
  bodyType: 'sock',
  seed: '5f0c9a2e-77aa-4c1d-9d6e-0b1c2d3e4f50',
  dare: 'two_minutes',
  screen: 'pass',
  ...extra,
});

/** Two friends and a haunt from the first to the second; the page id is what the sender is given. */
async function haunted(extra?: Record<string, unknown>) {
  const [sender, recipient] = [await person('Mai'), await person('Bo')];
  await befriend(sender, recipient);
  const { pageId } = sendHauntResponseSchema.parse(
    await ok(as(sender, 'POST', '/v1/haunts', sendBody(recipient, extra))),
  );
  return { sender, recipient, pageId };
}

const hauntPage = async (id: string) =>
  hauntPageSchema.parse(await ok(visit(`/v1/haunt-page/${id}`)));
const waitingFor = async (who: Person) =>
  (await ok<{ haunts: { id: string }[] }>(as(who, 'GET', '/v1/haunts'))).haunts;
const stateOf = async (id: string) =>
  (
    await env.DB.prepare('SELECT state FROM haunts WHERE id = ?')
      .bind(id)
      .first<{ state: string }>()
  )?.state;

describe('the haunt page', () => {
  it('shows the monster, the dare and the sender’s name to whoever holds the link', async () => {
    const { sender, recipient, pageId } = await haunted();

    const answer = await visit(`/v1/haunt-page/${pageId}`);
    const text = await answer.clone().text();

    expect(hauntPageSchema.parse(await answer.json())).toMatchObject({
      id: pageId,
      bodyType: 'sock',
      seed: '5f0c9a2e-77aa-4c1d-9d6e-0b1c2d3e4f50',
      dare: 'two_minutes',
      from: { displayName: 'Mai' },
      state: 'waiting',
    } satisfies Partial<HauntPage>);
    expect(answer.headers.get('Cache-Control')).toBe('private, no-store');
    expect(text).not.toContain(sender.accountId);
    expect(text).not.toContain(recipient.accountId);
    // The link's id is the haunt the recipient's phone is shown.
    expect(await waitingFor(recipient)).toMatchObject([{ id: pageId }]);
  });

  it('names nobody for a haunt sent without a name', async () => {
    const { sender, pageId } = await haunted({ anonymous: true });

    const answer = await visit(`/v1/haunt-page/${pageId}`);
    const text = await answer.clone().text();

    expect(hauntPageSchema.parse(await answer.json())).toMatchObject({
      from: null,
      state: 'waiting',
    });
    expect(text).not.toContain('Mai');
    expect(text).not.toContain(sender.accountId);
  });

  it('is gone, and names nobody, once the recipient has caught it', async () => {
    const { recipient, pageId } = await haunted();
    await ok(as(recipient, 'POST', `/v1/haunts/${pageId}/catch`));

    expect(await hauntPage(pageId)).toMatchObject({ state: 'gone', from: null });

    // Shooing by the link afterwards answers the same and leaves the catch as it was.
    const shooed = await ok(visit(`/v1/haunt-page/${pageId}/shoo`, { method: 'POST' }));
    expect(hauntPageShooResponseSchema.safeParse(shooed).success).toBe(true);
    expect(await stateOf(pageId)).toBe('caught');
  });

  it('is shooed by the link, once or many times, exactly as the app shoos it', async () => {
    const byLink = await haunted();
    const byApp = await haunted();

    const first = await visit(`/v1/haunt-page/${byLink.pageId}/shoo`, { method: 'POST' });
    const second = await visit(`/v1/haunt-page/${byLink.pageId}/shoo`, { method: 'POST' });
    await ok(as(byApp.recipient, 'POST', `/v1/haunts/${byApp.pageId}/shoo`));

    expect(first.status).toBe(200);
    expect(await second.text()).toBe(await first.text());
    expect(await hauntPage(byLink.pageId)).toMatchObject({ state: 'gone', from: null });
    expect(await waitingFor(byLink.recipient)).toEqual([]);
    // The same row either way, and the same page.
    expect(await stateOf(byLink.pageId)).toBe('shooed');
    expect(await stateOf(byApp.pageId)).toBe('shooed');
    const apart = { id: '', sentAt: '' };
    expect({ ...(await hauntPage(byLink.pageId)), ...apart }).toEqual({
      ...(await hauntPage(byApp.pageId)),
      ...apart,
    });
    // The week between haunts runs on for the sender, shooed or not.
    const again = await as(byLink.sender, 'POST', '/v1/haunts', sendBody(byLink.recipient));
    expect((await again.json<{ error: { detail: unknown } }>()).error.detail).toEqual({
      reason: 'haunted_recently',
    });
  });

  it('gives the link’s id no power on a route that takes a device', async () => {
    const { sender, recipient, pageId } = await haunted();
    const stranger = await person('Cy');

    for (const who of [sender, stranger]) {
      for (const action of ['catch', 'shoo']) {
        await notFound(as(who, 'POST', `/v1/haunts/${pageId}/${action}`));
      }
      expect(JSON.stringify(await waitingFor(who))).not.toContain(pageId);
    }
    // And the page offers nothing but the read and the shoo.
    for (const path of [`/v1/haunt-page/${pageId}/catch`, `/v1/haunts/${pageId}`]) {
      expect((await visit(path, { method: 'POST' })).status).not.toBe(200);
    }
    expect(await stateOf(pageId)).toBe('waiting');
    expect(await waitingFor(recipient)).toMatchObject([{ id: pageId }]);
  });

  it('answers an unknown id as not found, to read or to shoo', async () => {
    await notFound(visit('/v1/haunt-page/abcdefgh234567ab'));
    await notFound(visit('/v1/haunt-page/abcdefgh234567ab/shoo', { method: 'POST' }));
    await notFound(visit('/v1/haunt-page/gone'));
    await notFound(visit('/v1/haunt-page/gone/shoo', { method: 'POST' }));
  });
});

describe('the public pages’ limits', () => {
  it('count every read and shoo against the visitor’s address', async () => {
    const ip = freshIp();
    const paths = [
      ['GET', '/v1/table-invite/abcdefgh23'],
      ['GET', '/v1/haunt-page/abcdefgh234567ab'],
      ['POST', '/v1/haunt-page/abcdefgh234567ab/shoo'],
    ] as const;
    let refused: Response | undefined;
    for (let sent = 0; sent < 200 && refused === undefined; sent += 1) {
      const [method, path] = paths[sent % paths.length] ?? paths[0];
      const response = await visit(path, { method, ip });
      if (response.status !== 404) refused = response;
    }

    expect(refused?.status).toBe(429);
    expect(refused?.headers.get('Retry-After')).toBe('60');
    expect(await wireErrorOf(refused as Response)).toMatchObject({
      code: 'rate_limited',
      retryable: true,
    });
    for (const [method, path] of paths) {
      expect((await visit(path, { method, ip })).status).toBe(429);
    }
    // Another address is not affected.
    await notFound(visit('/v1/haunt-page/abcdefgh234567ab'));
  });
});

describe('the answers the website was built against', () => {
  it('are the shapes the routes give', () => {
    expect(tableInvitePageSchema.safeParse(openInvite).error?.issues).toBeUndefined();
    expect(tableInvitePageSchema.safeParse(closedInvite).error?.issues).toBeUndefined();
    expect(hauntPageSchema.safeParse(waitingHaunt).error?.issues).toBeUndefined();
    expect(
      hauntPageSchema.safeParse({ ...waitingHaunt, from: null, state: 'gone' }).error?.issues,
    ).toBeUndefined();
  });
});
