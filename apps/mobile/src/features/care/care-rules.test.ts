import { describe, expect, it } from '@jest/globals';

import type { ScreenInputRequest, ScreenInputResponse } from '@phusclass/domain';
import { MINUTE_MS, momentAt, type Task } from '@phusclass/domain/board';

import type { ScreenClient } from '../../api/screen-client';
import { openMigratedDatabase } from '../../data/test-database';
import { createBoardStore } from '../../state/board-store';

import { careActions } from './care-actions';
import { memory, readPlainCompany } from './care-memory';
import { careModeOf, lineKindFor, treatmentOf, canBeFunny } from './care-mode';
import { createScreening, screenOutcomeOf } from './screening';

// The server's screen, as recorded: the only test double, at the network boundary.
/* eslint-disable @typescript-eslint/no-require-imports -- recorded fixtures are JSON files */
const fixture = (name: string) =>
  (
    require(`../../../../../packages/voice/fixtures/${name}.json`) as {
      response: ScreenInputResponse;
    }
  ).response;
/* eslint-enable @typescript-eslint/no-require-imports */
const PASS = fixture('screen.input.en');
const SERIOUS = fixture('screen.input.serious.en');
const CRISIS = fixture('screen.input.crisis.en');
const UNSCREENED = fixture('screen.input.unscreened.en');

const CRISIS_PHRASE = 'email the landlord, and honestly I want to end my life';

/** A board on a real database, the care memory beside it, and a recorded screen. */
async function classAt(start: string) {
  const db = await openMigratedDatabase();
  let at = Date.parse(start);
  let id = 0;
  const store = createBoardStore({
    db,
    clock: () => momentAt(at, 'UTC', 4),
    newId: () => `task-${(id += 1)}`,
  });
  await store.load();
  memory.forget();
  const care = careActions(store, db);
  const sent: ScreenInputRequest[] = [];
  let answers: ScreenInputResponse[] = [];
  let online = false;
  let beFunny = false;
  const client: ScreenClient = {
    screenInput: (request) => {
      sent.push(request);
      const answer = answers.shift();
      return answer === undefined
        ? Promise.reject(new Error('no recorded answer'))
        : Promise.resolve(answer);
    },
  };
  const screening = createScreening({
    store,
    client,
    care,
    language: () => 'en',
    online: () => Promise.resolve(online),
    beFunny: () => Promise.resolve(beFunny),
    plainCompany: () => memory.get(),
    now: () => at,
  });
  const view = () => store.getSnapshot();
  return {
    db,
    store,
    care,
    screening,
    sent,
    view,
    mode: () => careModeOf(view(), memory.get()),
    task: (text: string): Task | undefined =>
      view().board.find((ranked) => ranked.task.text === text)?.task,
    answer: (...next: ScreenInputResponse[]) => {
      answers = next;
    },
    goOnline: (on = true) => {
      online = on;
    },
    setBeFunny: (on: boolean) => {
      beFunny = on;
    },
    wait: (minutes: number) => {
      at += minutes * MINUTE_MS;
      store.tick();
    },
  };
}

const morning = '2026-10-27T09:00:00Z';

describe('the crisis screen', () => {
  it('opens on a crisis phrase with no connection, hides every task and sends nothing', async () => {
    const c = await classAt(morning);
    await c.store.say('call the bank');
    await c.store.say(CRISIS_PHRASE);

    expect(c.view().phase).toBe('crisis');
    expect(c.mode()).toBe('crisis');
    expect(treatmentOf(c.mode())).toMatchObject({ tasksShown: false, pressure: false });
    expect(c.view().board).toEqual([]);
    expect(c.view().desk).toBeNull();

    // Back online while it is open: nothing is sent, and the crisis text never is.
    c.goOnline();
    c.answer(PASS, PASS);
    await c.screening.run();
    expect(c.sent).toEqual([]);
  });

  it('opens when the server calls a crisis on something said with a connection', async () => {
    const c = await classAt(morning);
    c.goOnline();
    await c.store.say('sort my things out before I go');
    c.answer(CRISIS);
    await c.screening.run();

    expect(c.sent.map((request) => request.text)).toEqual(['Sort my things out before I go']);
    expect(c.view().phase).toBe('crisis');
  });

  it('ends with the day when it is left open', async () => {
    const c = await classAt(morning);
    await c.store.say(CRISIS_PHRASE);
    expect(c.mode()).toBe('crisis');
    c.wait(24 * 60);
    expect(c.view().phase).not.toBe('crisis');
  });
});

describe('"It\'s fine, be funny"', () => {
  it('never lifts a crisis, by the switch or by the button', async () => {
    const c = await classAt(morning);
    c.setBeFunny(true);
    expect(screenOutcomeOf(CRISIS, { beFunny: true })).toEqual({ kind: 'crisis' });

    await c.store.say(CRISIS_PHRASE);
    await c.care.closeCrisis();
    const flagged = c.view().board.map((ranked) => ranked.task);
    expect(flagged.length).toBeGreaterThan(0);
    for (const task of flagged) {
      expect(task.care).toBe('crisis');
      expect(canBeFunny(task)).toBe(false);
      expect(await c.care.beFunny(task.id)).toBe(false);
    }
    expect(c.view().board.every((ranked) => ranked.task.care === 'crisis')).toBe(true);
  });

  it('lifts only what the screen judged serious, never a task still waiting for it', async () => {
    const c = await classAt(morning);
    await c.store.say('call the hospital about the biopsy results');
    const held = c.view().desk?.task;
    expect(held?.care).toBe('serious');
    expect(await c.care.beFunny(held?.id ?? '')).toBe(false);

    c.goOnline();
    c.answer(SERIOUS);
    await c.screening.run();
    expect(c.view().desk?.task).toMatchObject({ care: 'serious', screened: true });
    expect(await c.care.beFunny(held?.id ?? '')).toBe(true);
    expect(c.view().desk?.task.care).toBe('none');
  });
});

describe('after the crisis screen is closed', () => {
  it('brings the board back with no pressure, no act and nothing sold', async () => {
    const c = await classAt(morning);
    await c.store.say('email the landlord');
    c.wait(40);
    expect(c.view().desk?.pressure).toBeGreaterThan(0);

    await c.store.say('I keep thinking about how to kill myself');
    await c.care.closeCrisis();

    expect(c.view().phase).not.toBe('crisis');
    expect(c.view().board.length).toBe(2);
    expect(c.mode()).toBe('plain');
    expect(treatmentOf(c.mode())).toEqual({
      mode: 'plain',
      tasksShown: true,
      pressure: false,
      act: false,
      selling: false,
      notes: false,
    });
    expect(c.view().tuitionNotice).toBe(false);
    const landlord = c.task('Email the landlord');
    expect(landlord && lineKindFor(landlord, c.mode())).toBe('company');
    // Kept across a launch.
    expect(await readPlainCompany(c.db)).not.toBeNull();
  });

  it('keeps plain company until the next thing said is screened and cleared', async () => {
    const c = await classAt(morning);
    await c.store.say(CRISIS_PHRASE);
    await c.care.closeCrisis();
    c.wait(5);

    // Said with no connection: still plain.
    await c.store.say('buy milk');
    await c.screening.run();
    expect(c.mode()).toBe('plain');

    // Not judged by anyone trusted: still plain.
    c.goOnline();
    c.answer(UNSCREENED);
    await c.screening.run();
    expect(c.mode()).toBe('plain');
    expect(c.task('Buy milk')?.screened).toBe(false);

    c.wait(3);
    c.answer(PASS);
    await c.screening.run();
    expect(c.task('Buy milk')).toMatchObject({ screened: true, care: 'none' });
    expect(c.mode()).not.toBe('plain');
    expect(await readPlainCompany(c.db)).toBeNull();
  });

  it('ends plain company with the day', async () => {
    const c = await classAt(morning);
    await c.store.say(CRISIS_PHRASE);
    await c.care.closeCrisis();
    expect(c.mode()).toBe('plain');
    c.wait(24 * 60);
    expect(c.mode()).not.toBe('plain');
  });
});

describe('no joke before the screen', () => {
  it('keeps a task said offline plain until the server has cleared it', async () => {
    const c = await classAt(morning);
    await c.store.say('renew my passport');
    const said = c.task('Renew my passport');
    expect(said && lineKindFor(said, c.mode())).toBe('plain');

    await c.screening.run();
    expect(c.sent).toEqual([]);
    expect(c.task('Renew my passport')?.screened).toBe(false);

    // The fallback alone cannot clear it.
    c.goOnline();
    c.answer(UNSCREENED);
    await c.screening.run();
    const unscreened = c.task('Renew my passport');
    expect(unscreened && lineKindFor(unscreened, c.mode())).toBe('plain');

    c.wait(3);
    c.answer(PASS);
    await c.screening.run();
    const cleared = c.task('Renew my passport');
    expect(cleared && lineKindFor(cleared, c.mode())).toBe('pointed');
  });

  it('never clears a pass that came from anyone but Jev', () => {
    expect(screenOutcomeOf({ ...PASS, answeredBy: 'fallback' }, { beFunny: false })).toEqual({
      kind: 'ask again',
    });
    expect(screenOutcomeOf({ ...SERIOUS, answeredBy: 'fallback' }, { beFunny: true })).toEqual({
      kind: 'screened',
      care: 'serious',
    });
  });
});
