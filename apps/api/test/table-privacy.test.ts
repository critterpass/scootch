import { runInDurableObject } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { accountIdPattern } from '../src/accounts/ids';
import { everyLabel, seatLabel } from '../src/tables/labels';
import { readClientMessage, WORK_MODE_IDS } from '../src/tables/table-contract';
import { tableStub } from '../src/tables/tables';

import {
  as,
  befriend,
  inviteCode,
  ok,
  openTable,
  person,
  settle,
  sitDown,
  until,
  upgrade,
  postHaunt,
} from './table-support';

/** The tables this work added. Every column of every one is tried below. */
const newTables = [
  'accounts',
  'account_devices',
  'apple_nonces',
  'friend_invites',
  'friendships',
  'mutes',
  'blocks',
  'tables',
  'table_invites',
  'table_seats',
  'reports',
  'haunts',
] as const;

/** The one column that holds words a person chose: a screened name of at most 20 characters. */
const nameColumn = 'accounts.display_name';

const word = fc.stringMatching(/^[A-Za-zÀ-ỹ0-9'’,.!?-]{1,12}$/);
/** Something a person might write as a task: two or more words. */
const taskText = fc.array(word, { minLength: 2, maxLength: 12 }).map((words) => words.join(' '));

const vocabulary = new Set<string>(['start', 'nudge', 'mode', 'done', 'leave', ...WORK_MODE_IDS]);
const messageTypes = ['start', 'nudge', 'mode', 'leave', 'label', 'rename', 'chat'];
const fieldNames = ['label', 'text', 'task', 'to', 'workMode', 'minutes', 'hidden', 'note', 'name'];

describe('no task text at a table', { timeout: 60_000 }, () => {
  it('accepts no client message that carries words in any field', () => {
    const base = fc.constantFrom<Record<string, unknown>>(
      { type: 'start', minutes: 25 },
      { type: 'nudge', to: 'abcdefghijkl' },
      { type: 'mode', workMode: 'writing', hidden: false },
      { type: 'leave' },
    );
    fc.assert(
      fc.property(
        base,
        fc.constantFrom(...messageTypes),
        fc.constantFrom(...fieldNames),
        taskText,
        (message, type, field, text) => {
          for (const candidate of [
            { ...message, [field]: text },
            { type, [field]: text },
          ]) {
            expect(typeof readClientMessage(JSON.stringify(candidate))).toBe('string');
          }
        },
      ),
    );
  });

  it('accepts only messages whose every string is a fixed word or an account id', () => {
    fc.assert(
      fc.property(fc.jsonValue(), (value) => {
        const read = readClientMessage(JSON.stringify(value));
        if (typeof read === 'string') return;
        for (const field of Object.values(read)) {
          if (typeof field !== 'string') continue;
          expect(vocabulary.has(field) || accountIdPattern.test(field)).toBe(true);
        }
      }),
    );
    // And the accepted shapes themselves, so the property above is not vacuous.
    expect(readClientMessage('{"type":"mode","workMode":"paperwork","hidden":true}')).toEqual({
      type: 'mode',
      workMode: 'paperwork',
      hidden: true,
    });
    expect(readClientMessage('{"type":"label","label":"tax return"}')).toBe('label_text_refused');
  });

  it('shows only labels from the fixed table: one or two words, and none without a work mode', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(null, ...WORK_MODE_IDS),
        fc.boolean(),
        fc.constantFrom('en' as const, 'vi' as const),
        (workMode, hidden, language) => {
          const label = seatLabel({ workMode, hidden }, language);
          expect(everyLabel.has(label)).toBe(true);
          expect(label.split(' ').length).toBeLessThanOrEqual(2);
          if (workMode === null && !hidden) expect(label).toBe('');
        },
      ),
    );
  });

  it('keeps words out of a live table: refused on the way in, absent from every message and from storage', async () => {
    const secret = 'call the clinic about the biopsy';
    const host = await person('Mai');
    const guest = await person('Bo');
    const serious = await person('Cy');
    const { tableId, seat: hostSeat } = await openTable(host, '?mode=paperwork');
    const code = await inviteCode(host, tableId);
    const guestSeat = await sitDown(guest, code, tableId, '?mode=writing&hidden=1');
    await until(() => hostSeat.seatOf(guest)?.online === true, 'the guest to connect');
    expect(hostSeat.seatOf(guest)?.label).toBe('busy');
    // A serious or unscreened task: the phone sends no work mode at all.
    const seriousSeat = await sitDown(serious, code, tableId);

    for (const query of [
      `?label=${encodeURIComponent(secret)}`,
      `?mode=${encodeURIComponent(secret)}`,
      '?mode=writing&task=x',
    ]) {
      const response = await upgrade(guest, tableId, query);
      expect(response.status).toBe(400);
    }
    expect(
      await as(guest, 'POST', '/v1/tables/join', { code, purchase: 'free', label: secret }).then(
        (r) => r.status,
      ),
    ).toBe(400);
    for (const message of [
      { type: 'label', label: secret },
      { type: 'mode', workMode: secret, hidden: false },
      { type: 'mode', workMode: 'writing', hidden: false, label: secret },
      { type: 'nudge', to: secret },
      { type: 'start', minutes: 25, note: secret },
    ]) {
      guestSeat.send(message);
    }
    await until(() => guestSeat.of('error').length === 5, 'five refusals');
    expect(guestSeat.of('error').map((error) => error.code)).toEqual([
      'label_text_refused',
      'bad_message',
      'bad_message',
      'bad_message',
      'bad_message',
    ]);
    guestSeat.send({ type: 'mode', workMode: 'dishes', hidden: false });
    await until(() => hostSeat.seatOf(guest)?.label === 'dishes', 'the new label');
    await settle();

    expect(hostSeat.seatOf(host)?.label).toBe('admin');
    expect(seriousSeat.seatOf(serious)?.label).toBe('');
    expect(hostSeat.seatOf(serious)?.label).toBe('');
    const everything = JSON.stringify([
      hostSeat.messages,
      guestSeat.messages,
      seriousSeat.messages,
    ]);
    expect(everything).not.toContain('biopsy');
    for (const seat of [hostSeat, guestSeat, seriousSeat]) {
      for (const state of seat.of('state')) {
        for (const each of state.seats) expect(everyLabel.has(each.label)).toBe(true);
      }
    }

    const stored = await runInDurableObject(tableStub(env, tableId), async (_instance, state) =>
      JSON.stringify([...(await state.storage.list())]),
    );
    expect(stored).not.toContain('biopsy');
    const [[key, kept] = []] = JSON.parse(stored) as [string, { seats: object[] }][];
    expect(key).toBe('table');
    expect(Object.keys(kept?.seats[0] ?? {}).sort()).toEqual(
      [
        'accountId',
        'done',
        'hidden',
        'inSession',
        'name',
        'nudges',
        'nudgesSent',
        'offlineSince',
        'onPass',
        'seatedAt',
        'workMode',
      ].sort(),
    );
    for (const table of newTables) {
      const rows = JSON.stringify((await env.DB.prepare(`SELECT * FROM ${table}`).all()).results);
      expect(rows).not.toContain('biopsy');
    }
  });

  it('shows a Vietnamese label to a Vietnamese phone', async () => {
    const host = await person('Mai');
    const guest = await person('Bo');
    await env.DB.prepare("UPDATE devices SET language = 'vi' WHERE token_hash = ?")
      .bind(guest.deviceHash)
      .run();
    const { tableId } = await openTable(host, '?mode=laundry');

    const guestSeat = await sitDown(guest, await inviteCode(host, tableId), tableId, '?hidden=1');

    expect(guestSeat.seatOf(host)?.label).toBe('giặt đồ');
    expect(guestSeat.seatOf(guest)?.label).toBe('đang bận');
  });

  it('has no stored column that can hold task text, the screened name aside', async () => {
    // One real row in every table, made the way the app makes them.
    const host = await person('Mai');
    const guest = await person('Bo');
    await befriend(host, guest);
    const { tableId } = await openTable(host);
    const guestSeat = await sitDown(guest, await inviteCode(host, tableId), tableId);
    await ok(as(host, 'POST', '/v1/accounts/apple/nonce'));
    await ok(as(host, 'POST', '/v1/friends/invites'));
    await ok(as(host, 'POST', '/v1/seats/mute', { accountId: guest.accountId, muted: true }));
    await ok(
      as(host, 'POST', '/v1/seats/report', {
        tableId,
        accountId: guest.accountId,
        reason: 'nudge_spam',
      }),
    );
    await ok(
      postHaunt(host, {
        to: guest.accountId,
        bodyType: 'sock',
        seed: '5f0c9a2e-77aa-4c1d-9d6e-0b1c2d3e4f50',
        dare: 'two_minutes',
        screen: 'pass',
      }),
    );
    await env.DB.prepare('INSERT INTO blocks (blocker, blocked) VALUES (?, ?)')
      .bind(guest.accountId, host.accountId)
      .run();
    expect(guestSeat.state.seats).toHaveLength(2);

    const columns: { table: string; column: string }[] = [];
    for (const table of newTables) {
      const row = await env.DB.prepare(`SELECT * FROM ${table} LIMIT 1`).first();
      expect(row, `a row in ${table}`).not.toBeNull();
      for (const column of Object.keys(row ?? {})) columns.push({ table, column });
    }
    expect(columns.length).toBeGreaterThan(40);

    await fc.assert(
      fc.asyncProperty(fc.constantFrom(...columns), taskText, async ({ table, column }, text) => {
        fc.pre(`${table}.${column}` !== nameColumn || [...text].length > 20);
        const write = env.DB.prepare(`UPDATE ${table} SET "${column}" = ?`).bind(text).run();
        await expect(write, `${table}.${column} took ${JSON.stringify(text)}`).rejects.toThrow();
      }),
      { numRuns: 300 },
    );
  });
});
