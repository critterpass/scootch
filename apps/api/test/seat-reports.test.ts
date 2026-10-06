import { env } from 'cloudflare:workers';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { handleUpdate } from '../src/bot/webhook';

import { ask, botEnv, founderChatId, telegram, webhookSecret } from './bot-support';
import {
  as,
  count,
  inviteCode,
  ok,
  openTable,
  person,
  reasonOf,
  settle,
  sitDown,
  until,
  upgrade,
  type Person,
  type Seat,
} from './table-support';

afterEach(() => {
  vi.unstubAllGlobals();
});

type Chat = ReturnType<typeof telegram>;
const posts = (chat: Chat) => chat.sent.filter((message) => message.url.endsWith('/sendMessage'));

/** A host and a guest at one table, with Telegram replaced at the network boundary. */
async function tableOfTwo(): Promise<{
  host: Person;
  guest: Person;
  tableId: string;
  hostSeat: Seat;
  guestSeat: Seat;
  chat: Chat;
}> {
  const chat = telegram();
  vi.stubGlobal('fetch', chat.fetch);
  const host = await person('Mai');
  const guest = await person('Rude Name');
  const { tableId, seat: hostSeat } = await openTable(host, '?mode=paperwork');
  const guestSeat = await sitDown(guest, await inviteCode(host, tableId), tableId, '?mode=writing');
  return { host, guest, tableId, hostSeat, guestSeat, chat };
}

const report = (
  from: Person,
  tableId: string,
  accountId: string,
  extra: Record<string, unknown> = {},
) =>
  as(
    from,
    'POST',
    '/v1/seats/report',
    { tableId, accountId, reason: 'nudge_spam', ...extra },
    botEnv(),
  );

function tap(data: string, chatId = founderChatId): unknown {
  return {
    update_id: 10_002,
    callback_query: {
      id: '4382bfdwdsb323b2d9',
      from: { id: chatId, is_bot: false, first_name: 'Someone' },
      message: {
        message_id: 9,
        chat: { id: chatId, type: 'private' },
        date: 1_791_342_000,
        text: 'Table report',
      },
      chat_instance: '-1',
      data,
    },
  };
}

async function reportId(reported: Person): Promise<number> {
  const row = await env.DB.prepare('SELECT id FROM reports WHERE reported = ? ORDER BY id DESC')
    .bind(reported.accountId)
    .first<{ id: number }>();
  return row?.id ?? -1;
}

describe('reporting a seat', () => {
  it('reaches the bot once, with ids, the name, the reason, the nudge count and three buttons', async () => {
    const { host, guest, tableId, hostSeat, guestSeat, chat } = await tableOfTwo();
    guestSeat.send({ type: 'nudge', to: host.accountId });
    guestSeat.send({ type: 'nudge', to: host.accountId });
    await until(() => hostSeat.of('nudged').length === 2, 'two nudges');

    await ok(report(host, tableId, guest.accountId));
    await ok(report(host, tableId, guest.accountId));

    const id = await reportId(guest);
    expect(posts(chat)).toHaveLength(1);
    expect(posts(chat)[0]?.body).toEqual({
      chat_id: String(founderChatId),
      text: [
        `[dev] Table report ${id}: nudge spam`,
        `Reported: ${guest.accountId} "Rude Name"`,
        `Reporter: ${host.accountId}`,
        'Nudges sent by reported: 2',
      ].join('\n'),
      reply_markup: {
        inline_keyboard: [
          [
            { text: 'Dismiss', callback_data: `report:${id}:dismiss` },
            { text: 'Warn', callback_data: `report:${id}:warn` },
            { text: 'Ban', callback_data: `report:${id}:ban` },
          ],
        ],
      },
    });
    // Nothing about what either was doing: no label, no work mode.
    expect(posts(chat)[0]?.body.text).not.toMatch(/writing|admin|paperwork/);
  });

  it('never tells the reported person, and can leave in the same step', async () => {
    const { host, guest, tableId, hostSeat, guestSeat } = await tableOfTwo();
    const before = guestSeat.messages.length;

    await ok(report(host, tableId, guest.accountId, { reason: 'feels_unsafe', alsoLeave: true }));

    await until(() => hostSeat.closed !== undefined, 'the reporter to leave');
    await until(() => guestSeat.state.seats.length === 1, 'the seat to empty');
    // All the reported person sees is a seat emptying, as with any leave.
    expect(guestSeat.messages.slice(before).every((message) => message.type === 'state')).toBe(
      true,
    );
    const theirs = JSON.stringify(await ok(as(guest, 'GET', '/v1/accounts/me')));
    expect(theirs).not.toContain(host.accountId);
    expect(theirs).not.toContain('report');
  });

  it('takes a reason only from the fixed list, no words, and only about someone at the same table', async () => {
    const { host, guest, tableId, chat } = await tableOfTwo();
    const outsider = await person('Cy');

    expect(
      (await report(host, tableId, guest.accountId, { reason: 'they are annoying' })).status,
    ).toBe(400);
    expect(
      (await report(host, tableId, guest.accountId, { note: 'they are annoying' })).status,
    ).toBe(400);
    expect(await reasonOf(report(outsider, tableId, guest.accountId))).toBe('not_at_table');
    expect(await reasonOf(report(host, tableId, host.accountId))).toBe('not_yourself');
    expect(posts(chat)).toHaveLength(0);
  });

  it('is rate limited per account', async () => {
    const { host, guest, tableId, chat } = await tableOfTwo();
    const now = new Date().toISOString();
    for (let index = 0; index < 5; index += 1) {
      await env.DB.prepare(
        `INSERT INTO reports (reporter, reported, table_id, reason, nudge_count, created_at)
         VALUES (?, ?, 'aaaaaaaaaaaaaaaa', 'something_else', 0, ?)`,
      )
        .bind(host.accountId, guest.accountId, now)
        .run();
    }

    const response = await report(host, tableId, guest.accountId);

    expect(response.status).toBe(429);
    expect(posts(chat)).toHaveLength(0);
  });
});

describe('the report buttons', () => {
  async function reported() {
    const scene = await tableOfTwo();
    await ok(report(scene.host, scene.tableId, scene.guest.accountId));
    return { ...scene, id: await reportId(scene.guest) };
  }
  const press = (chat: Chat, data: string, chatId?: number, secret = webhookSecret) =>
    handleUpdate({ env: botEnv(), now: new Date(), fetch: chat.fetch }, secret, tap(data, chatId));

  it.each(['dismiss', 'warn', 'ban'])(
    'do nothing when %s is tapped from another chat',
    async (action) => {
      const { guest, guestSeat, chat, id } = await reported();
      const sentBefore = chat.sent.length;

      expect(await press(chat, `report:${id}:${action}`, 9999)).toBe(false);
      expect(await press(chat, `report:${id}:${action}`, founderChatId, 'not-the-secret')).toBe(
        false,
      );

      await settle();
      expect(chat.sent).toHaveLength(sentBefore);
      expect(await count('reports WHERE id = ? AND outcome IS NULL', id)).toBe(1);
      expect(
        await count(
          'accounts WHERE id = ? AND banned_at IS NULL AND warned_at IS NULL',
          guest.accountId,
        ),
      ).toBe(1);
      expect(guestSeat.closed).toBeUndefined();
    },
  );

  it('Ban removes the person from the table and keeps them out; a second tap changes nothing', async () => {
    const { host, guest, tableId, hostSeat, guestSeat, chat, id } = await reported();

    expect(await press(chat, `report:${id}:ban`)).toBe(true);

    await until(() => guestSeat.closed !== undefined, 'the banned seat to close');
    expect(guestSeat.closed?.code).toBe(4403);
    await until(() => hostSeat.state.seats.length === 1, 'the seat to empty');
    expect(posts(chat).at(-1)?.body.text).toBe(`[dev] Report ${id}: banned (${guest.accountId}).`);
    expect(chat.sent.at(-1)?.url).toContain('/answerCallbackQuery');
    const code = await inviteCode(host, tableId);
    expect(await reasonOf(as(guest, 'POST', '/v1/tables/join', { code, purchase: 'free' }))).toBe(
      'not_allowed',
    );
    expect(await reasonOf(upgrade(guest, tableId))).toBe('not_allowed');

    await press(chat, `report:${id}:dismiss`);
    expect(posts(chat).at(-1)?.body.text).toBe(`[dev] Report ${id} was already banned.`);
    expect(await count('accounts WHERE id = ? AND banned_at IS NOT NULL', guest.accountId)).toBe(1);
  });

  it('Warn flags the account and Dismiss does nothing to it', async () => {
    const warned = await reported();
    await press(warned.chat, `report:${warned.id}:warn`);
    expect(await ok(as(warned.guest, 'GET', '/v1/accounts/me'))).toMatchObject({ warned: true });
    expect(warned.guestSeat.closed).toBeUndefined();

    const dismissed = await reported();
    await press(dismissed.chat, `report:${dismissed.id}:dismiss`);
    expect(await ok(as(dismissed.guest, 'GET', '/v1/accounts/me'))).toMatchObject({
      warned: false,
    });
    expect(await count("reports WHERE id = ? AND outcome = 'dismissed'", dismissed.id)).toBe(1);
  });
});

describe('/ban and /unban', () => {
  it('ban an account by id and let it back', async () => {
    const { host, guest, tableId, guestSeat } = await tableOfTwo();
    vi.unstubAllGlobals();

    expect(await ask(`/ban ${guest.accountId}`)).toBe(
      `[dev] Account ${guest.accountId} is banned from tables.`,
    );
    await until(() => guestSeat.closed !== undefined, 'the banned seat to close');
    const code = await inviteCode(host, tableId);
    expect(await reasonOf(as(guest, 'POST', '/v1/tables/join', { code, purchase: 'free' }))).toBe(
      'not_allowed',
    );

    expect(await ask(`/unban ${guest.accountId}`)).toBe(
      `[dev] Account ${guest.accountId} may use tables again.`,
    );
    await ok(as(guest, 'POST', '/v1/tables/join', { code, purchase: 'free' }));

    expect(await ask('/ban nobody')).toContain('Usage: /ban');
    expect(await ask('/ban abcdefghijkl')).toBe('[dev] No account has that id.');
  });
});
