import { describe, expect, it } from '@jest/globals';

import { attitudeSchema, type TaskCreatePass, type TaskCreateResponse } from '@scootch/domain';
import { checkLine, offlinePacks } from '@scootch/voice';

import crisisFixture from '../../../../../packages/voice/fixtures/task.create.crisis.en.json';
import passFixture from '../../../../../packages/voice/fixtures/task.create.en.json';
import seriousFixture from '../../../../../packages/voice/fixtures/task.create.serious.en.json';
import { carePhone, careServer } from '../care/test/care-phone';

import { doneLine } from './done-line';

const serious = seriousFixture.response as TaskCreateResponse;
const pass = passFixture.response as TaskCreatePass;
const crisis = crisisFixture.response as TaskCreateResponse;
const heavyWords = seriousFixture.request.text;

type Phone = Awaited<ReturnType<typeof carePhone>>;
const attitudes = attitudeSchema.options;

/** Every line the attitude packs end a day on: the jokes a heavy day must never hear. */
const ATTITUDE_ENDINGS = attitudes.map((attitude) => offlinePacks.en.noTask[attitude].doneForToday);
const QUIET = offlinePacks.en.plain.doneForToday;

/** Sits with today's one thing until its time is up, then finishes it the way its tone does. */
async function finish(phone: Phone, how: 'finish_tapped' | 'caught') {
  await phone.sit();
  phone.time.advanceTo(phone.time.clock.now() + 10 * 60_000);
  await phone.store.dispatch({ type: 'session', event: { type: 'clock' } });
  await phone.session({ type: how });
  await phone.runner.settled();
}

/** The resting home's line in every attitude, as said now and once the session's line is gone. */
function restingLines(phone: Phone) {
  const state = phone.store.getState();
  expect(state.today.kind).toBe('done_for_today');
  return attitudes.flatMap((attitude) => {
    const voice = { language: 'en', attitude } as const;
    return [doneLine(state.line, voice, state), doneLine(null, voice, state)];
  });
}

describe('the line a finished day rests on', () => {
  it('is the plain one after a serious task is finished, in every attitude', async () => {
    const phone = await carePhone(careServer(serious));
    await phone.type(heavyWords);
    await finish(phone, 'finish_tapped');

    const said = restingLines(phone);
    expect(new Set(said)).toEqual(new Set([QUIET]));
  });

  it('is the plain one once the care screen is closed on a crisis day', async () => {
    const phone = await carePhone(careServer(crisis));
    await phone.type(heavyWords);
    await phone.store.dispatch({ type: 'care_closed' });

    const said = restingLines(phone);
    expect(new Set(said)).toEqual(new Set([QUIET]));
  });

  it('stays plain on a day that held a serious finish and an ordinary one after it', async () => {
    const server = careServer(serious);
    const phone = await carePhone(server);
    await phone.type(heavyWords);
    await finish(phone, 'finish_tapped');

    server.answer = pass;
    await phone.type('Email the dentist');
    await phone.runner.settled();
    await phone.store.dispatch({ type: 'one_thing_picked' });
    await finish(phone, 'caught');

    // The ordinary finish said its own line in its session; the day still ends quietly.
    const said = restingLines(phone);
    expect(new Set(said)).toEqual(new Set([QUIET]));
    for (const ending of ATTITUDE_ENDINGS) expect(said).not.toContain(ending);
  });

  it('keeps its own voice on an ordinary day', async () => {
    const phone = await carePhone(careServer(pass));
    await phone.type('Email the dentist');
    await phone.runner.settled();
    await phone.store.dispatch({ type: 'one_thing_picked' });
    await finish(phone, 'caught');

    const state = phone.store.getState();
    expect(state.today.kind).toBe('done_for_today');
    for (const attitude of attitudes) {
      const voice = { language: 'en', attitude } as const;
      expect(doneLine(null, voice, state)).toBe(offlinePacks.en.noTask[attitude].doneForToday);
    }
    expect(restingLines(phone)).not.toContain(QUIET);
  });

  it.each(['en', 'vi'] as const)('is a plain %s line that passes the voice check', (language) => {
    const text = offlinePacks[language].plain.doneForToday;
    expect(checkLine({ text, kind: 'plainStep', language, attitude: 'soft' })).toEqual({
      ok: true,
      reasons: [],
    });
  });
});
