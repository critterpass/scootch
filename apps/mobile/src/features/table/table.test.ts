import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from '@jest/globals';

import type { TaskCreatePass, TaskCreateResponse } from '@scootch/domain';

import fixtures from '../../../../../packages/domain/src/contracts/fixtures/table-messages.json';
import passFixture from '../../../../../packages/voice/fixtures/task.create.en.json';
import seriousFixture from '../../../../../packages/voice/fixtures/task.create.serious.en.json';
import { ALL_ON } from '../../effects/test/fake-adapters';
import { createTogetherRuntime } from '../../state/together-context';
import { hauntToSend } from '../haunt/haunt-rules';
import { MORNING, phone } from '../session/test/phone';

import { seatControls } from './seat-controls';
import { labelModeFor, openTableStep, showsTableEntry, tableTimer } from './table-rules';
import { fakeHttp, fakeSockets } from './test/fake-table';

const pass = passFixture.response as TaskCreatePass;
const serious = seriousFixture.response as TaskCreateResponse;
const TABLE = 'abcdefghijklmnop';
const [STATE] = fixtures.server;
const YOU = 'abcdefghijkl';
const OTHER = 'mnopqrstuvwx';
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

/** A phone with its day store, at a table over fake HTTP and a fake socket. */
async function seated(answer: TaskCreateResponse = pass, text = passFixture.request.text) {
  const app = await phone(answer);
  await app.store.dispatch({ type: 'text_submitted', text, source: 'typed', energy: 'medium' });
  const { today } = app.store.getState();
  const task = 'task' in today ? today.task : null;
  const net = fakeSockets();
  const web = fakeHttp({
    'POST /v1/tables': { tableId: TABLE },
    'POST /v1/tables/join': { tableId: TABLE },
    [`POST /v1/tables/${TABLE}/invites`]: { code: 'abcdefghij', expiresAt: '2026-10-07T09:00:00Z' },
  });
  const together = createTogetherRuntime({
    http: web.http,
    baseUrl: 'https://api.test',
    token: () => Promise.resolve('device-token'),
    open: net.open,
    timers: app.time.timers,
    runner: app.runner,
    purchase: () => 'yearly',
    now: () => app.time.clock.now(),
  });
  const tableId = await together.api.openTable(together.purchaseState());
  together.table.sit(tableId, labelModeFor(task));
  await flush();
  net.last().accept();
  net.last().say(STATE);
  return { app, task, net, web, together };
}

describe('what leaves the phone for a table', () => {
  it('never holds the task: not in a request, an address or a socket message', async () => {
    const { app, task, net, web, together } = await seated();
    const { api, table } = together;
    table.setMode({ hidden: true });
    table.setMode({ hidden: false });
    table.nudge(OTHER);
    table.start(25);
    await api.tableInvite(TABLE);
    await api.joinTable('abcdefghij', 'free');
    await seatControls(api, table).mute(OTHER, true);
    await seatControls(api, table).report(OTHER, 'nudge_spam', false);
    const { monster } = app.store.getState();
    if (monster) await api.sendHaunt(hauntToSend(monster, OTHER, 'two_minutes', false));
    await seatControls(api, table).block(OTHER);

    const left = JSON.stringify([web.sent, net.sockets.map((one) => [one.url, one.sent])]);
    expect(task).not.toBeNull();
    const words = `${task?.text} ${task?.originalText}`.toLowerCase().match(/[a-z]{5,}/g) ?? [];
    expect(words.length).toBeGreaterThan(0);
    // A work mode id may share a word with a task ("email"); nothing else of it may appear.
    const leaked = words.filter(
      (word) => word !== task?.workMode && left.toLowerCase().includes(word),
    );
    expect(leaked).toEqual([]);
    expect(web.sent.length).toBeGreaterThan(5);
  });

  it('tells the table the work mode of an ordinary task', async () => {
    const { task, net } = await seated();
    expect(task?.workMode).not.toBeNull();
    expect(net.sockets[0]?.url).toBe(`wss://api.test/v1/tables/${TABLE}/ws?mode=${task?.workMode}`);
  });

  it('sends no work mode for a serious task, so its seat has no label', async () => {
    const { task, net } = await seated(serious, 'Call the hospital about the results');
    expect(task?.screen).toBe('serious');
    expect(net.sockets[0]?.url).toBe(`wss://api.test/v1/tables/${TABLE}/ws`);
  });

  it('sends no work mode for a task nobody has screened', () => {
    expect(
      labelModeFor({ screen: 'unscreened', seriousOverridden: false, workMode: 'email' }),
    ).toBeNull();
    expect(
      labelModeFor({ screen: 'serious', seriousOverridden: true, workMode: 'email' }),
    ).toBeNull();
    expect(labelModeFor({ screen: 'pass', seriousOverridden: false, workMode: 'email' })).toBe(
      'email',
    );
    expect(labelModeFor(null)).toBeNull();
  });
});

describe('nudges', () => {
  it('sends three, then explains the fourth kindly and never sends it', async () => {
    const { net, together } = await seated();
    const { table } = together;
    const nudges = () => net.frames().filter((frame) => frame.includes('"nudge"'));
    for (let sent = 1; sent <= 3; sent += 1) {
      expect(table.nudge(OTHER)).toBe(true);
      net.last().say({ type: 'nudge_sent', to: OTHER, nudgesLeft: 3 - sent });
    }
    expect(nudges()).toHaveLength(3);
    expect(table.getState().notice).toBeNull();

    expect(table.nudge(OTHER)).toBe(false);
    expect(nudges()).toHaveLength(3);
    expect(table.getState().notice).toEqual({ kind: 'nudge_limit', to: OTHER });
  });

  it('plays one haptic for a received nudge, and shows the wave', async () => {
    const { app, net, together } = await seated();
    const before = app.device.calls.haptics.length;
    net.last().say({ type: 'nudged', from: OTHER });
    await app.runner.settled();
    expect(app.device.calls.haptics).toHaveLength(before + 1);
    expect(app.device.calls.cues).not.toContain('nudge');
    expect(together.table.getState().notice).toEqual({ kind: 'nudged', from: OTHER });
    expect(ALL_ON.haptics).toBe(true);
  });
});

describe('the connection and the person’s own session', () => {
  it('leaves a running session alone when the line drops, and says the table is reconnecting', async () => {
    const { app, net, together } = await seated();
    await app.store.dispatch({ type: 'session_set', minutes: 25, treat: null });
    await app.session({ type: 'started' });
    const running = app.store.getState().session;
    expect(running).toMatchObject({ phase: 'running', endsAt: MORNING + 25 * 60_000 });

    net.last().cut();
    expect(together.table.getState().status).toBe('reconnecting');
    expect(app.store.getState().session).toEqual(running);
    expect(app.store.getState().today.kind).toBe('in_session');

    // The session's own timer still comes due with the line down.
    app.time.advanceTo(MORNING + 25 * 60_000);
    await app.runner.settled();
    await flush();
    expect(app.store.getState().today.kind).toBe('in_session');
    expect(net.sockets.length).toBeGreaterThan(1);
  });

  it('keeps the seats it last saw while reconnecting, and notices a seat that emptied', async () => {
    const { net, together } = await seated();
    expect(together.table.getState().seats).toHaveLength(3);
    expect(together.table.getState().you).toBe(YOU);
    net.last().cut();
    expect(together.table.getState().seats).toHaveLength(3);
    const { table } = together;
    table.wake();
    await flush();
    net.last().accept();
    net
      .last()
      .say({ ...STATE, seats: (STATE as { seats: { userId: string }[] }).seats.slice(0, 2) });
    expect(table.getState().notice).toEqual({ kind: 'left', name: null });
  });

  it('offers the table’s timer without ever ending a session', () => {
    const idle = { endsAt: null, minutes: null, clockAhead: 0 };
    const going = { endsAt: 2_000, minutes: 25 as const, clockAhead: 0 };
    expect(tableTimer(idle, { taskSet: true, inSession: false }, 1_000)).toEqual({
      kind: 'start',
      minutes: 10,
    });
    expect(tableTimer(going, { taskSet: true, inSession: false }, 1_000)).toEqual({
      kind: 'join_in',
      minutes: 25,
      left: 1,
    });
    expect(tableTimer(going, { taskSet: false, inSession: false }, 1_000)).toEqual({
      kind: 'need_task',
    });
    expect(tableTimer(idle, { taskSet: true, inSession: true }, 1_000)).toEqual({
      kind: 'running',
    });
  });
});

describe('seat controls', () => {
  it('call their own routes and put nothing about the other person on the table', async () => {
    const { net, web, together } = await seated();
    const controls = seatControls(together.api, together.table);
    const before = net.frames().length;
    await controls.mute(OTHER, true);
    await controls.report(OTHER, 'feels_unsafe', false);
    expect(web.sent.slice(-2)).toEqual([
      { method: 'POST', path: '/v1/seats/mute', body: { accountId: OTHER, muted: true } },
      {
        method: 'POST',
        path: '/v1/seats/report',
        body: { tableId: TABLE, accountId: OTHER, reason: 'feels_unsafe', alsoLeave: false },
      },
    ]);
    expect(net.frames()).toHaveLength(before);
    expect(together.table.getState().tableId).toBe(TABLE);
  });

  it('leave the table after a report that asks to, and after a block', async () => {
    const reported = await seated();
    await seatControls(reported.together.api, reported.together.table).report(
      OTHER,
      'nudge_spam',
      true,
    );
    expect(reported.web.sent.at(-1)?.body).toMatchObject({ alsoLeave: true });
    expect(reported.together.table.getState().tableId).toBeNull();

    const blocked = await seated();
    await seatControls(blocked.together.api, blocked.together.table).block(OTHER);
    expect(blocked.web.sent.at(-1)).toEqual({
      method: 'POST',
      path: '/v1/seats/block',
      body: { accountId: OTHER, blocked: true },
    });
    expect(blocked.together.table.getState().tableId).toBeNull();
    // The only word to the table is the person's own leaving.
    expect(blocked.net.frames()).toEqual(['{"type":"leave"}']);
  });
});

describe('the way in', () => {
  it('is on the screen beside an ordinary task', async () => {
    const { app } = await seated();
    expect(showsTableEntry(app.store.getState())).toBe(true);
  });

  it('is absent beside a serious task and on a day that held one', async () => {
    const { app } = await seated(serious, 'Call the hospital about the results');
    expect(showsTableEntry(app.store.getState())).toBe(false);
    await app.store.dispatch({ type: 'serious_set_aside' });
    expect(app.store.getState().heavyToday).toBe(true);
    expect(showsTableEntry(app.store.getState())).toBe(false);
    expect(showsTableEntry({ today: { kind: 'crisis' }, heavyToday: false })).toBe(false);
  });

  it('opens the Plus sheet from "Open a table" without Plus, and a table with it', () => {
    expect(openTableStep(false)).toBe('locked');
    expect(openTableStep(true)).toBe('open');
    // The locked control's tap is the only thing in the lobby that names the sheet.
    const lobby = readFileSync(path.join(__dirname, 'lobby-containers.tsx'), 'utf8');
    expect(lobby.match(/PLUS_SHEET/g)).toHaveLength(2);
    expect(lobby).toContain('onLocked={() => router.push(PLUS_SHEET)}');
    expect(readFileSync(path.join(__dirname, 'lobby-page.tsx'), 'utf8')).toContain(
      "onPress={openTableStep(props.plus) === 'open' ? props.onOpen : props.onLocked}",
    );
  });
});
