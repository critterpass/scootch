import { describe, expect, it } from '@jest/globals';

import { FREE_STARTS_PER_DAY, PLUS_STARTS_PER_DAY } from '@scootch/domain';

import { stageOf } from '../one-screen/one-screen-stage';

import { CUSTOMERS, fakeStore } from './test/fake-purchases';
import { plusPhone } from './test/plus-phone';

type Phone = Awaited<ReturnType<typeof plusPhone>>;
const stage = (app: Phone) => stageOf({ ...app.store.getState(), energyAsked: false }).kind;
const today = (app: Phone) => app.store.getState().today;

describe('"One more"', () => {
  /** Finishes one thing after another through "One more", up to the day's limit. */
  async function finishEveryStart(app: Phone, limit: number): Promise<void> {
    for (let done = 1; done <= limit; done += 1) {
      if (done > 1) {
        await app.store.dispatch({ type: 'one_more_asked' });
        expect(stage(app)).toBe('composer');
      }
      await app.finishOne(`Small thing ${done}`);
      expect(today(app)).toEqual({ kind: 'done_for_today', startsLeft: limit - done });
      expect(stage(app)).toBe('done');
    }
  }

  it('lets the free app start one thing after another, and then stops at the limit', async () => {
    const app = await plusPhone(fakeStore());
    await finishEveryStart(app, FREE_STARTS_PER_DAY);

    // That was the last: the ask does not come back, and the home is done.
    await app.store.dispatch({ type: 'one_more_asked' });
    expect(app.store.getState().oneMore).toBe(false);
    expect(stage(app)).toBe('done');
    expect(await app.repositories.tasks.all()).toHaveLength(FREE_STARTS_PER_DAY);
  });

  it('lets Plus carry on past the free limit to its own, and then stops', async () => {
    const app = await plusPhone(fakeStore({ customer: CUSTOMERS.yearly }));
    expect(PLUS_STARTS_PER_DAY).toBeGreaterThan(FREE_STARTS_PER_DAY);
    await finishEveryStart(app, PLUS_STARTS_PER_DAY);

    await app.store.dispatch({ type: 'one_more_asked' });
    expect(app.store.getState().oneMore).toBe(false);
    expect(stage(app)).toBe('done');
    expect(await app.repositories.tasks.all()).toHaveLength(PLUS_STARTS_PER_DAY);
  });

  it('follows the store: a trial raises the limit, and its end brings the free one back', async () => {
    const shop = fakeStore();
    const app = await plusPhone(shop);
    await app.finishOne('Reply to Sam');
    expect(today(app)).toMatchObject({ startsLeft: FREE_STARTS_PER_DAY - 1 });

    app.port.push(CUSTOMERS.trial);
    await app.store.dispatch({ type: 'entitlement_changed' });
    expect(today(app)).toMatchObject({
      kind: 'done_for_today',
      startsLeft: PLUS_STARTS_PER_DAY - 1,
    });
    await app.store.dispatch({ type: 'one_more_asked' });
    expect(stage(app)).toBe('composer');

    app.port.push(CUSTOMERS.expired);
    await app.store.dispatch({ type: 'entitlement_changed' });
    expect(today(app)).toMatchObject({
      kind: 'done_for_today',
      startsLeft: FREE_STARTS_PER_DAY - 1,
    });
    // What was caught while Plus was on is still there.
    expect((await app.repositories.monsters.all()).filter((one) => one.caughtOn)).toHaveLength(1);
  });
});
