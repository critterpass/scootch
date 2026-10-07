import { describe, expect, it } from '@jest/globals';

import { HOUR_MS, MINUTE_MS, type SessionEvent } from '@scootch/domain';

import { openRepositories } from '../data/repositories';

import { sittingsOf } from './late-catch';
import { MORNING, stagedPhone, stagedServer } from './test/staged-phone';

type Phone = Awaited<ReturnType<typeof stagedPhone>>;
const session = (app: Phone, event: SessionEvent) => app.store.dispatch({ type: 'session', event });
const END = new Date(MORNING + 10 * MINUTE_MS).toISOString();

/** A ten-minute session whose time ran out three hours ago, with the phone left on the screen. */
async function leftOnTimeUp(): Promise<Phone> {
  const app = await stagedPhone(stagedServer());
  await app.say('ring the bank', 'typed');
  await app.store.dispatch({ type: 'one_thing_picked' });
  await app.store.dispatch({ type: 'monster_met' });
  await app.store.dispatch({ type: 'session_set', minutes: 10 });
  await session(app, { type: 'started' });
  app.time.advanceTo(MORNING + 3 * HOUR_MS);
  return app;
}

describe('time worked', () => {
  it('stops at the planned end when the finish comes long after time was up', async () => {
    const app = await leftOnTimeUp();
    await session(app, { type: 'double_tapped' });
    const { sessions, monsters } = openRepositories(app.data.db);
    expect(await sessions.all()).toMatchObject([{ endedAt: END, outcome: 'finished' }]);
    expect(await monsters.all()).toMatchObject([{ catchMinutes: 10 }]);
  });

  it('stops there for "not finished" too, whichever choice follows', async () => {
    const app = await leftOnTimeUp();
    await session(app, { type: 'not_finished' });
    await session(app, { type: 'chose_make_smaller' });
    const { sessions } = openRepositories(app.data.db);
    expect(await sessions.all()).toMatchObject([{ endedAt: END, outcome: 'not_finished' }]);
  });

  it('is the real time for a session ended early', async () => {
    const app = await stagedPhone(stagedServer());
    await app.say('ring the bank', 'typed');
    await app.store.dispatch({ type: 'one_thing_picked' });
    await app.store.dispatch({ type: 'session_set', minutes: 10 });
    await session(app, { type: 'started' });
    app.time.advanceTo(MORNING + 4 * MINUTE_MS);
    await session(app, { type: 'double_tapped' });
    const { sessions } = openRepositories(app.data.db);
    expect((await sessions.all())[0]?.endedAt).toBe(
      new Date(MORNING + 4 * MINUTE_MS).toISOString(),
    );
  });

  it('is read capped from a row an earlier version stored with idle time in it', async () => {
    const app = await leftOnTimeUp();
    await session(app, { type: 'left' });
    const repositories = openRepositories(app.data.db);
    const [row] = await repositories.sessions.all();
    if (!row) throw new Error('a session was started');
    await repositories.sessions.put({
      ...row,
      endedAt: new Date(MORNING + 3 * HOUR_MS).toISOString(),
    });
    const [sitting] = await sittingsOf({ deps: { repositories } as never }, app.task());
    expect(sitting && sitting.endedAt - sitting.startedAt).toBe(10 * MINUTE_MS);
  });
});

describe('the notification for the end of a session', () => {
  const atEnd = (app: Phone) =>
    app.device.scheduled().filter((one) => one.at === MORNING + 10 * MINUTE_MS);

  it('is waiting while the session runs and gone when it is finished or left', async () => {
    const app = await stagedPhone(stagedServer());
    await app.say('ring the bank', 'typed');
    await app.store.dispatch({ type: 'one_thing_picked' });
    await app.store.dispatch({ type: 'session_set', minutes: 10 });
    await session(app, { type: 'started' });
    await app.store.dispatch({ type: 'app_backgrounded' });
    expect(atEnd(app)).toHaveLength(1);

    await session(app, { type: 'left' });
    expect(atEnd(app)).toEqual([]);
  });
});
