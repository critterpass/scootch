import { describe, expect, it } from '@jest/globals';

import {
  MINUTE_MS,
  monsterRowSchema,
  recordBarRowSchema,
  worldPieceRowSchema,
  type SessionEvent,
  type TaskCreatePass,
  type TaskCreateResponse,
} from '@scootch/domain';

import passFixture from '../../../../../packages/voice/fixtures/task.create.en.json';
import seriousFixture from '../../../../../packages/voice/fixtures/task.create.serious.en.json';
import { opensOnSession } from '../../state/session-relaunch';

import { sessionView, NOTHING_PASSED } from './session-view';
import { MORNING, phone } from './test/phone';
import { SAID_DONE } from './voice-finish-trigger';

const pass = passFixture.response as TaskCreatePass;
const serious = seriousFixture.response as TaskCreateResponse;

const FINISHES: Record<string, readonly SessionEvent[]> = {
  hold: [{ type: 'hold_started' }, { type: 'hold_completed' }],
  double_tap: [{ type: 'double_tapped' }],
  voice: [SAID_DONE],
};

describe('finishing a session', () => {
  it('reaches the same finish and the same earnings by holding, tapping twice or saying done', async () => {
    const outcomes = [];
    for (const [method, events] of Object.entries(FINISHES)) {
      const app = await phone(pass);
      await app.begin(passFixture.request.text, 10, 'coffee');
      app.time.advanceTo(MORNING + 4 * MINUTE_MS);
      for (const event of events) await app.session(event);

      const [row] = await app.repositories.sessions.all();
      expect(row).toMatchObject({ outcome: 'finished', finishMethod: method });
      const state = app.store.getState();
      outcomes.push({
        phase: state.session?.phase,
        today: state.today.kind,
        burst: state.burst,
        treat: state.treat,
        line: state.line,
        monsters: await app.repositories.monsters.all(),
        pieces: await app.repositories.worldPieces.all(),
        bars: await app.repositories.recordBars.all(),
        cues: app.device.calls.cues.filter((cue) => cue !== 'hold-rising'),
      });
    }
    expect(outcomes[0]).toMatchObject({ phase: 'finished', burst: 'confetti', treat: 'coffee' });
    expect(outcomes[1]).toEqual(outcomes[0]);
    expect(outcomes[2]).toEqual(outcomes[0]);
  });

  it('writes the card, a world piece and the bar of the day, each valid against its contract', async () => {
    const app = await phone(pass);
    await app.begin(passFixture.request.text, 10, 'coffee');
    app.time.advanceTo(MORNING + 4 * MINUTE_MS);
    await app.session({ type: 'double_tapped' });

    const [monster] = await app.repositories.monsters.all();
    expect(monsterRowSchema.parse(monster)).toMatchObject({
      name: pass.monster.name,
      caughtOn: '2026-10-06',
      number: 1,
      rarity: 'common',
      daysLurked: 0,
      catchMinutes: 4,
      dread: 1,
    });
    expect(monster?.caughtAt).not.toBeNull();

    const pieces = await app.repositories.worldPieces.all();
    expect(pieces).toHaveLength(1);
    expect(worldPieceRowSchema.parse(pieces[0])).toMatchObject({
      kind: 'monster',
      monsterId: monster?.id,
      addedOn: '2026-10-06',
    });

    // 6 October 2026 is a Tuesday: the second bar of its week, played by the bassline.
    const bars = await app.repositories.recordBars.all();
    expect(bars).toHaveLength(1);
    expect(recordBarRowSchema.parse(bars[0])).toMatchObject({
      localDate: '2026-10-06',
      week: '2026-W41',
      position: 2,
      instrument: 'bassline',
      monsterId: monster?.id,
    });
  });

  it('gives a serious task its plain piece and its bar, with no card, burst or treat', async () => {
    const app = await phone(serious);
    await app.begin(seriousFixture.request.text, 10, 'tea');
    expect(app.store.getState().session).toMatchObject({ tone: 'quiet' });
    expect(app.store.getState().burst).toBeNull();
    app.time.advanceTo(MORNING + 6 * MINUTE_MS);
    await app.session({ type: 'finish_tapped' });

    const state = app.store.getState();
    expect(state).toMatchObject({ burst: null, treat: null });
    expect(app.device.calls.bursts).toEqual([]);
    expect(app.data.count('monsters')).toBe(0);
    const pieces = await app.repositories.worldPieces.all();
    expect(pieces).toMatchObject([{ kind: 'plain', monsterId: null }]);
    expect(await app.repositories.recordBars.all()).toMatchObject([
      { localDate: '2026-10-06', monsterId: null, seed: '2026-10-06' },
    ]);
    // The screens go from the plain line to home: no treat is handed over.
    const view = sessionView({
      session: state.session,
      burst: state.burst,
      treat: state.treat,
      parkedThoughts: state.parkedThoughts,
      finishWith: 'hold',
      passed: NOTHING_PASSED,
    });
    expect(view).toEqual({ kind: 'moment', quiet: true });
  });

  it('leaves no row behind when the task is let go', async () => {
    const app = await phone(pass);
    await app.begin(passFixture.request.text, 10, 'coffee');
    app.time.advanceTo(MORNING + 10 * MINUTE_MS);
    await app.session({ type: 'not_finished' });
    await app.session({ type: 'chose_let_go' });

    for (const table of [
      'tasks',
      'monsters',
      'sessions',
      'parked_thoughts',
      'world_pieces',
      'record_bars',
    ]) {
      expect([table, app.data.count(table)]).toEqual([table, 0]);
    }
    await app.store.dispatch({ type: 'session_closed' });
    expect(app.store.getState()).toMatchObject({ session: null, line: null, treat: null });
  });

  it('says another working line when asked, from the task own pack', async () => {
    const app = await phone(pass);
    await app.begin(passFixture.request.text, 25);
    const said = [];
    for (let turn = 0; turn < pass.lines.working.length; turn += 1) {
      await app.store.dispatch({ type: 'working_line_turned' });
      said.push(app.store.getState().line);
    }
    expect(new Set(said.map((line) => line?.text))).toEqual(new Set(pass.lines.working));
    expect(said.every((line) => line?.slot === 'working')).toBe(true);
  });
});

describe('opening the app again', () => {
  it('lands on the running session with the right time left', async () => {
    const first = await phone(pass);
    await first.begin(passFixture.request.text, 25);

    const second = await phone(pass, first.data, MORNING + 9 * MINUTE_MS);
    const state = second.store.getState();
    expect(opensOnSession(state)).toBe(true);
    expect(state.session).toMatchObject({
      phase: 'running',
      endsAt: MORNING + 25 * MINUTE_MS,
    });
    // Nothing is replayed: no burst, no cue, no second session.
    expect(state.burst).toBeNull();
    expect(second.device.calls.cues).toEqual([]);
    expect(second.data.count('sessions')).toBe(1);
  });

  it('lands on the finish choice when the session ended while the app was closed', async () => {
    const first = await phone(pass);
    await first.begin(passFixture.request.text, 10);

    const second = await phone(pass, first.data, MORNING + 40 * MINUTE_MS);
    const state = second.store.getState();
    expect(opensOnSession(state)).toBe(true);
    expect(state.session).toMatchObject({ phase: 'time_up' });
    expect(state.line).toEqual({ slot: 'timeUp', text: pass.lines.timeUp });
    // Nothing plays late.
    expect(second.device.calls.cues).toEqual([]);
  });

  it('does not offer a check-in that was already seen', async () => {
    const first = await phone(pass);
    await first.begin(passFixture.request.text, 25);
    // Half-way: the timed check-in comes up, and the person says okay.
    first.time.advanceTo(MORNING + 13 * MINUTE_MS);
    await first.runner.settled();
    await first.session({ type: 'clock' });
    expect(first.store.getState().session).toMatchObject({ phase: 'stuck' });
    await first.session({ type: 'step_accepted' });

    const second = await phone(pass, first.data, MORNING + 15 * MINUTE_MS);
    expect(second.store.getState().session).toMatchObject({ phase: 'running', checkedIn: true });
    // And it does not come back on a later tick either.
    second.time.advanceTo(MORNING + 18 * MINUTE_MS);
    await second.session({ type: 'clock' });
    expect(second.store.getState().session).toMatchObject({ phase: 'running' });
  });

  it('still offers a check-in whose moment is ahead', async () => {
    const first = await phone(pass);
    await first.begin(passFixture.request.text, 25);

    const second = await phone(pass, first.data, MORNING + 5 * MINUTE_MS);
    expect(second.store.getState().session).toMatchObject({ phase: 'running', checkedIn: false });
    second.time.advanceTo(MORNING + 13 * MINUTE_MS);
    await second.session({ type: 'clock' });
    expect(second.store.getState().session).toMatchObject({ phase: 'stuck' });
  });

  it('keeps a "not finished" tap made before the app was killed', async () => {
    const first = await phone(pass);
    await first.begin(passFixture.request.text, 10);
    await first.session({ type: 'thought_parked', text: 'bin bags' });
    first.time.advanceTo(MORNING + 10 * MINUTE_MS);
    await first.session({ type: 'not_finished' });

    const second = await phone(pass, first.data, MORNING + 12 * MINUTE_MS);
    const state = second.store.getState();
    expect(opensOnSession(state)).toBe(true);
    expect(state.session).toMatchObject({ phase: 'not_finished' });
    expect(state.line).toEqual({ slot: 'notFinished', text: pass.lines.notFinished });

    // The three choices still work from here.
    await second.session({ type: 'chose_carry_on' });
    const [row] = await second.repositories.sessions.all();
    expect(row).toMatchObject({ outcome: 'not_finished', notFinishedChoice: 'carry_on' });
    expect(row?.endedAt).not.toBeNull();
    expect(second.store.getState().parkedThoughts.map((one) => one.text)).toEqual(['bin bags']);
    expect(second.data.count('world_pieces') + second.data.count('record_bars')).toBe(0);
  });

  it('ends a running session in a few seconds for a device flow, and only sooner', async () => {
    const app = await phone(pass);
    await app.begin(passFixture.request.text, 10);
    await app.store.dispatch({ type: 'developer_session_ends_in', seconds: 3 });
    expect(app.store.getState().session).toMatchObject({ endsAt: MORNING + 3000 });
    app.time.advanceTo(MORNING + 3000);
    await app.runner.settled();
    await app.session({ type: 'clock' });
    expect(app.store.getState().session).toMatchObject({ phase: 'time_up' });

    // After a kill the stored end is the shortened one.
    const again = await phone(pass, app.data, MORNING + 4000);
    expect(again.store.getState().session).toMatchObject({ phase: 'time_up' });
  });
});
