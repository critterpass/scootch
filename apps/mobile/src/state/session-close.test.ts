import { describe, expect, it } from '@jest/globals';

import type { SessionEvent } from '@scootch/domain';

import { openRepositories } from '../data/repositories';

import { MORNING, stagedPhone, stagedServer } from './test/staged-phone';

/** A phone with one thing set and its session started, and a second session row left open. */
async function midSessionWithAStrayRow() {
  const app = await stagedPhone(stagedServer());
  await app.say('ring the bank', 'typed');
  await app.store.dispatch({ type: 'one_thing_picked' });
  await app.store.dispatch({ type: 'monster_met' });
  await app.store.dispatch({ type: 'session_set', minutes: 10 });
  await app.store.dispatch({ type: 'session', event: { type: 'started' } });
  const { sessions } = openRepositories(app.data.db);
  const [row] = await sessions.all();
  if (!row) throw new Error('the started session has a row');
  // As an earlier version of the app, or a start taken up twice, could leave behind.
  await sessions.put({ ...row, id: 'left-open-beside-it' });
  app.time.advanceTo(MORNING + 4 * 60_000);
  return { app, sessions };
}

describe('a session stopped on purpose, with a second row left open in storage', () => {
  const choices: readonly SessionEvent['type'][] = [
    'chose_carry_on',
    'chose_make_smaller',
    'chose_let_go',
  ];

  it.each(choices)(
    'leaves nothing under way after %s, so home never sends anyone back',
    async (choice) => {
      const { app, sessions } = await midSessionWithAStrayRow();
      await app.store.dispatch({ type: 'session', event: { type: 'not_finished' } });
      await app.store.dispatch({ type: 'session', event: { type: choice } as SessionEvent });
      await app.store.dispatch({ type: 'session_closed' });

      const { today, session } = app.store.getState();
      expect(session).toBeNull();
      // The day is not in a session: the one screen stays on the one screen.
      expect(today.kind).not.toBe('in_session');
      expect((await sessions.all()).filter((row) => row.endedAt === null)).toEqual([]);
    },
  );

  it('closes a row that is open with no session behind it, whatever left it so', async () => {
    const { app, sessions } = await midSessionWithAStrayRow();
    await app.store.dispatch({ type: 'session', event: { type: 'not_finished' } });
    await app.store.dispatch({ type: 'session', event: { type: 'chose_make_smaller' } });
    await app.store.dispatch({ type: 'session_closed' });
    // Opened again behind the store's back.
    const [row] = await sessions.all();
    if (!row) throw new Error('the session left its row');
    await sessions.put({ ...row, id: 'opened-again', endedAt: null });

    await app.store.dispatch({ type: 'session_closed' });
    expect(app.store.getState().today.kind).toBe('task_set');
    expect((await sessions.all()).filter((one) => one.endedAt === null)).toEqual([]);
  });
});
