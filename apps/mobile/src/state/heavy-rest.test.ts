import { describe, expect, it } from '@jest/globals';

import type { TaskCreateStartResponse } from '@scootch/domain';

import seriousFixture from '../../../../packages/voice/fixtures/task.create.serious.en.json';

import { stagedPhone, stagedServer } from './test/staged-phone';

const serious = {
  ...seriousFixture.response,
  parked: [{ text: 'Buy milk' }, { text: 'Water the fern' }],
  deadlines: [
    {
      text: 'Library books',
      dueDate: '2026-10-09',
      heardAs: 'by Friday',
      line: 'Library books, by Friday.',
    },
  ],
} as TaskCreateStartResponse;

describe('a ramble with one heavy thing in it', () => {
  it('marks only the heavy thing: the rest is parked unscreened, not serious', async () => {
    const app = await stagedPhone(stagedServer({ start: serious }));
    await app.say(seriousFixture.request.text);
    expect(app.task().screen).toBe('serious');
    const { items } = app.store.getState().drawer;
    expect(items.map((item) => item.text).sort()).toEqual([
      'Buy milk',
      'Library books',
      'Water the fern',
    ]);
    expect(items.map((item) => item.screen)).toEqual(['unscreened', 'unscreened', 'unscreened']);
  });

  it('does not make a later day heavy because of what sits in the drawer', async () => {
    const app = await stagedPhone(stagedServer({ start: serious }));
    await app.say(seriousFixture.request.text);
    expect(app.store.getState().heavyToday).toBe(true);
    // The heavy task itself is let go of; only the ordinary things it came with remain.
    await app.data.db.runAsync('DELETE FROM tasks', []);
    await app.store.dispatch({ type: 'entitlement_changed' });
    expect(app.store.getState().heavyToday).toBe(false);
  });
});
