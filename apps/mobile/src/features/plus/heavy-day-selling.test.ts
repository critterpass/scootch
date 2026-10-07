import { describe, expect, it } from '@jest/globals';

import {
  DAY_MS,
  OFFER_AFTER_CATCHES,
  PLUS_STARTS_PER_DAY,
  type TaskCreateResponse,
} from '@scootch/domain';

import seriousFixture from '../../../../../packages/voice/fixtures/task.create.serious.en.json';
import { plusLine } from '../../state/lines';
import { readOfferFacts } from '../../state/plus-runtime';
import { showsSelling } from '../../state/shows-comedy';

import { offerShows } from './offer-rules';
import { CUSTOMERS, fakeStore } from './test/fake-purchases';
import { MORNING, plusPhone } from './test/plus-phone';

const serious = seriousFixture.response as TaskCreateResponse;
const voice = { language: 'en', attitude: 'unhinged' } as const;

/** A Plus phone whose one thing today was serious, and has been set aside for another day. */
async function heavyDay() {
  const app = await plusPhone(
    fakeStore({ customer: CUSTOMERS.yearly }),
    undefined,
    MORNING,
    serious,
  );
  await app.store.dispatch({
    type: 'text_submitted',
    text: 'Call the hospital about the results',
    source: 'typed',
    energy: 'low',
  });
  return app;
}

describe('nothing is sold near something heavy', () => {
  it('sells on an ordinary finished day, and not beside a serious task or on a crisis day', async () => {
    const ordinary = await plusPhone(fakeStore({ customer: CUSTOMERS.yearly }));
    await ordinary.finishOne('Reply to Sam');
    expect(showsSelling(ordinary.store.getState())).toBe(true);
    expect(plusLine('plusOffer', voice, ordinary.store.getState())).not.toBeNull();

    const app = await heavyDay();
    expect(app.store.getState().today.kind).toBe('serious');
    expect(showsSelling(app.store.getState())).toBe(false);
    expect(showsSelling({ today: { kind: 'crisis' }, heavyToday: false })).toBe(false);
  });

  it('still lets another thing start once the serious task is set aside, and sells nothing', async () => {
    const app = await heavyDay();
    await app.store.dispatch({ type: 'serious_set_aside' });
    const state = app.store.getState();
    expect(state.today).toEqual({ kind: 'done_for_today', startsLeft: PLUS_STARTS_PER_DAY });
    expect(state.heavyToday).toBe(true);
    expect(showsSelling(state)).toBe(false);

    // A start still open under the day's limit is the person's own, not an offer of Plus.
    await app.store.dispatch({ type: 'one_more_asked' });
    expect(app.store.getState().oneMore).toBe(true);
    expect(showsSelling(app.store.getState())).toBe(false);
  });

  it('keeps it away after a serious task is finished, and the day after while it waits in the drawer', async () => {
    const app = await heavyDay();
    await app.store.dispatch({ type: 'session_set', minutes: 10, treat: null });
    await app.session({ type: 'started' });
    await app.session({ type: 'finish_tapped' });
    await app.store.dispatch({ type: 'session_closed' });
    expect(app.store.getState().today.kind).toBe('done_for_today');
    expect(showsSelling(app.store.getState())).toBe(false);

    const waiting = await heavyDay();
    await waiting.store.dispatch({ type: 'serious_set_aside' });
    const nextDay = await plusPhone(
      fakeStore({ customer: CUSTOMERS.yearly }),
      waiting.data,
      MORNING + DAY_MS,
    );
    expect(nextDay.store.getState().today.kind).toBe('nothing_yet');
    expect(showsSelling(nextDay.store.getState())).toBe(false);
  });

  it('never shows the first offer, and speaks no Plus line, on such a day', async () => {
    const app = await heavyDay();
    await app.store.dispatch({ type: 'serious_set_aside' });
    const state = app.store.getState();
    const facts = await readOfferFacts(app.repositories, state);
    expect(facts.selling).toBe(false);
    const now = app.time.clock.now();
    const due = {
      ...facts,
      catches: OFFER_AFTER_CATCHES,
      lastFinishAt: now - DAY_MS,
      firstLaunchDone: true,
    };
    const seen = { dismissedAt: null, worldVisitedAt: now - 1 };
    expect(offerShows({ ...due, selling: true }, seen, 'free', now)).toBe(true);
    expect(offerShows(due, seen, 'free', now)).toBe(false);
    for (const slot of ['plusOffer', 'lifetime', 'trialStarted', 'trialLastDay'] as const) {
      expect(plusLine(slot, voice, state)).toBeNull();
    }
  });
});
