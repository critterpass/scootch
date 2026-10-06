import { describe, expect, it } from '@jest/globals';

import { PLUS_STARTS_PER_DAY } from '@scootch/domain';

import { stageOf } from '../one-screen/one-screen-stage';

import { CUSTOMERS, fakeStore } from './test/fake-purchases';
import { plusPhone } from './test/plus-phone';

type Phone = Awaited<ReturnType<typeof plusPhone>>;
const stage = (app: Phone) => stageOf({ ...app.store.getState(), energyAsked: false }).kind;
const today = (app: Phone) => app.store.getState().today;

describe('"One more"', () => {
  it('starts nothing on the free app: the day stays done and the daily limit stays one', async () => {
    const app = await plusPhone(fakeStore());
    await app.finishOne('Reply to Sam');
    expect(today(app)).toEqual({ kind: 'done_for_today', startsLeft: 0 });

    await app.store.dispatch({ type: 'one_more_asked' });
    expect(app.store.getState().oneMore).toBe(false);
    expect(stage(app)).toBe('done');
  });

  it('lets Plus start a second and a third thing, and then stops', async () => {
    const app = await plusPhone(fakeStore({ customer: CUSTOMERS.yearly }));
    expect(PLUS_STARTS_PER_DAY).toBe(3);
    await app.finishOne('Reply to Sam');
    expect(today(app)).toEqual({ kind: 'done_for_today', startsLeft: 2 });
    // Nothing comes back until it is asked for.
    expect(stage(app)).toBe('done');

    await app.store.dispatch({ type: 'one_more_asked' });
    expect(stage(app)).toBe('composer');
    await app.finishOne('Take the bins out');
    expect(today(app)).toEqual({ kind: 'done_for_today', startsLeft: 1 });
    expect(stage(app)).toBe('done');

    await app.store.dispatch({ type: 'one_more_asked' });
    expect(stage(app)).toBe('composer');
    await app.finishOne('Water the plant');
    expect(today(app)).toEqual({ kind: 'done_for_today', startsLeft: 0 });

    await app.store.dispatch({ type: 'one_more_asked' });
    expect(app.store.getState().oneMore).toBe(false);
    expect(stage(app)).toBe('done');
    expect(await app.repositories.tasks.all()).toHaveLength(3);
  });

  it('follows the store: a trial opens the day, and its end closes the ask again', async () => {
    const shop = fakeStore();
    const app = await plusPhone(shop);
    await app.finishOne('Reply to Sam');
    expect(today(app)).toMatchObject({ startsLeft: 0 });

    app.port.push(CUSTOMERS.trial);
    await app.store.dispatch({ type: 'entitlement_changed' });
    expect(today(app)).toMatchObject({ kind: 'done_for_today', startsLeft: 2 });
    await app.store.dispatch({ type: 'one_more_asked' });
    expect(stage(app)).toBe('composer');

    app.port.push(CUSTOMERS.expired);
    await app.store.dispatch({ type: 'entitlement_changed' });
    expect(today(app)).toMatchObject({ kind: 'done_for_today', startsLeft: 0 });
    expect(stage(app)).toBe('done');
    // What was caught while Plus was on is still there.
    expect((await app.repositories.monsters.all()).filter((one) => one.caughtOn)).toHaveLength(1);
  });
});
