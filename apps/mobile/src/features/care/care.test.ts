import { describe, expect, it } from '@jest/globals';

import type { TaskCreatePass, TaskCreateResponse, TodayState } from '@scootch/domain';
import { offlinePacks } from '@scootch/voice';

import crisisFixture from '../../../../../packages/voice/fixtures/task.create.crisis.en.json';
import passFixture from '../../../../../packages/voice/fixtures/task.create.en.json';
import seriousFixture from '../../../../../packages/voice/fixtures/task.create.serious.en.json';
import { enCareWords } from '../../api/care-words/en';
import { lineFor } from '../../state/lines';
import { showsComedy, type Comedy } from '../../state/shows-comedy';
import { stageOf } from '../one-screen/one-screen-stage';
import { revealSteps } from '../reveal/reveal-steps';
import { NOTHING_PASSED, sessionView } from '../session/session-view';
import { shareOffered } from '../share/share-rules';

import { HELPLINES, HELPLINE_DIRECTORY, helplinesFor } from './helplines';
import { carePhone, careServer } from './test/care-phone';

const serious = seriousFixture.response as TaskCreateResponse;
const pass = passFixture.response as TaskCreatePass;
const crisis = crisisFixture.response as TaskCreateResponse;
const heavyWords = seriousFixture.request.text;
const EVERYTHING: readonly Comedy[] = ['monster', 'joke', 'card', 'share', 'burst', 'notification'];
/** Every cue that belongs to the comedy: the burst, the hatch, the hold and the caught finish. */
const LOUD_CUES = ['start-burst', 'hatch', 'hold-rising', 'finish', 'shrink', 'squeak'];
/** An explicit phrase, taken from the phone's own word list so that none is written here. */
const explicitPhrase = `${enCareWords.crisis[0] ?? ''}`.replace('*', '');

const taskOf = (today: TodayState) => {
  if (!('task' in today)) throw new Error(`no task today: ${today.kind}`);
  return today.task;
};

type Phone = Awaited<ReturnType<typeof carePhone>>;

/** Everything on the phone that would be comedy, gathered so a test can assert it is all absent. */
const SOFT_GENERIC: readonly string[] = offlinePacks.en.lines.soft.notification;

async function comedyOnThePhone(phone: Phone) {
  const state = phone.store.getState();
  const task = 'task' in state.today ? state.today.task : null;
  const stage = stageOf({ ...state, energyAsked: false });
  const cheeky = Object.values(offlinePacks.en.lines).flatMap((lines) =>
    Object.values(lines).flat(),
  );
  return {
    allowed: EVERYTHING.filter((what) => showsComedy(task, what)),
    monsters: (await phone.repositories.monsters.all()).length,
    monsterOnScreen: state.monster !== null || stage.kind === 'hatch',
    reveal: stage.kind === 'one_thing' && stage.reveal !== null,
    shareOffered: shareOffered(task),
    bursts: [...phone.device.calls.bursts],
    burstShown: state.burst,
    loudCues: phone.device.calls.cues.filter((cue) => LOUD_CUES.includes(cue)),
    // What is planned for the days ahead after a serious task is soft and never about a task.
    notifications: phone.device.scheduled().filter((one) => !SOFT_GENERIC.includes(one.text))
      .length,
    jokesSaid: phone.device.calls.lines.filter((line) =>
      cheeky.some((joke) => line.endsWith(joke)),
    ),
  };
}

const NOTHING = {
  allowed: [],
  monsters: 0,
  monsterOnScreen: false,
  reveal: false,
  shareOffered: false,
  bursts: [],
  burstShown: null,
  loudCues: [],
  notifications: 0,
  jokesSaid: [],
};

describe('a serious task', () => {
  it('goes through the whole day with no monster, joke, card, share, burst or notification', async () => {
    const phone = await carePhone(careServer(serious));
    const { store } = phone;

    await phone.type(heavyWords);
    expect(store.getState().today.kind).toBe('serious');
    // Its own quiet screen at once: not offered, not revealed, not hatched.
    expect(stageOf({ ...store.getState(), energyAsked: false })).toMatchObject({
      kind: 'task_set',
      quiet: true,
      monster: null,
    });
    expect(await comedyOnThePhone(phone)).toEqual(NOTHING);

    // Every word Scootch has for it is one of its own plain lines, in an unhinged voice too.
    const task = taskOf(store.getState().today);
    const plain = Object.values(seriousFixture.response.lines).flat();
    for (const slot of ['hatch', 'start', 'working', 'checkIn', 'caught', 'notFinished'] as const) {
      const said = lineFor(slot, task, { language: 'en', attitude: 'unhinged' });
      if (said !== null) expect(plain).toContain(said);
    }

    await phone.sit();
    const running = store.getState();
    expect(running.session).toMatchObject({ phase: 'running', tone: 'quiet' });
    const view = (state = store.getState()) =>
      sessionView({ ...state, finishWith: state.settings.finishWith, passed: NOTHING_PASSED });
    expect(view()).toMatchObject({ kind: 'working', quiet: true });
    expect(await comedyOnThePhone(phone)).toEqual(NOTHING);

    // Time runs out and the plain tap finishes: no hold, no confetti, no reveal.
    phone.time.advanceTo(phone.time.clock.now() + 10 * 60_000);
    await store.dispatch({ type: 'session', event: { type: 'clock' } });
    await phone.session({ type: 'finish_tapped' });
    expect(store.getState().session).toMatchObject({ phase: 'finished', tone: 'quiet' });
    expect(view()).toEqual({ kind: 'moment', quiet: true });
    expect(revealSteps({ tone: 'quiet', card: true, piece: true, bar: true, drop: true })).toEqual(
      [],
    );
    expect(await comedyOnThePhone(phone)).toEqual({ ...NOTHING, allowed: [] });

    // What it leaves: a plain piece of the world, and no card.
    expect((await phone.repositories.worldPieces.all()).map((piece) => piece.kind)).toEqual([
      'plain',
    ]);
    expect((await phone.repositories.monsters.all()).filter((one) => one.number !== null)).toEqual(
      [],
    );
    expect(phone.finishes()).toBe(1);
  });

  it('gets its comedy back when the person says it is fine to be funny', async () => {
    const server = careServer(serious);
    const phone = await carePhone(server);
    await phone.type(heavyWords);

    server.answer = { ...pass, seriousOverridden: true };
    await phone.store.dispatch({ type: 'be_funny_asked' });

    expect(server.requests.at(-1)).toMatchObject({ overrideSerious: true });
    const state = phone.store.getState();
    expect(state.today.kind).toBe('task_set');
    const task = taskOf(state.today);
    expect(task).toMatchObject({ screen: 'pass', seriousOverridden: true });
    expect(EVERYTHING.filter((what) => showsComedy(task, what))).toEqual(EVERYTHING);
    expect(state.monster).not.toBeNull();
  });

  it('sets one plain reminder when asked, and nothing else is ever scheduled for it', async () => {
    const phone = await carePhone(careServer(serious));
    await phone.type(heavyWords);

    await phone.store.dispatch({ type: 'reminder_asked' });
    await phone.runner.settled();

    // 10:00 in London is past the quarter-hour lead, so the next whole hour is 11:00.
    expect(phone.device.scheduled()).toEqual([
      expect.objectContaining({
        at: Date.parse('2026-10-06T10:00:00.000Z'),
        text: offlinePacks.en.plain.reminder,
      }),
    ]);

    await phone.store.dispatch({ type: 'serious_set_aside' });
    await phone.runner.settled();
    // The reminder is gone, and what is planned for the days ahead is soft and not about a task.
    for (const one of phone.device.scheduled()) expect(SOFT_GENERIC).toContain(one.text);
    expect(phone.store.getState().today.kind).toBe('done_for_today');
    expect(phone.store.getState().line?.text).toBe(seriousFixture.response.lines.notFinished);
    expect((await phone.repositories.drawerItems.all()).map((item) => item.screen)).toEqual([
      'serious',
    ]);
  });
});

describe('a crisis day', () => {
  it('cannot be overridden by asking for the jokes back', async () => {
    const server = careServer(crisis);
    const phone = await carePhone(server);
    await phone.type(heavyWords);
    expect(phone.store.getState().today.kind).toBe('crisis');
    const asked = server.requests.length;

    server.answer = { ...pass, seriousOverridden: true };
    await phone.store.dispatch({ type: 'be_funny_asked' });
    await phone.type('Email the dentist');

    expect(phone.store.getState().today.kind).toBe('crisis');
    expect(server.requests).toHaveLength(asked);
    expect(await comedyOnThePhone(phone)).toEqual(NOTHING);
  });

  it('beats a session that is running when the screen answers for its task', async () => {
    // Typed and started with no connection; the answer comes back mid-session.
    const server = careServer(crisis, false);
    const phone = await carePhone(server);
    await phone.type('Sort the post');
    await phone.sit();
    expect(phone.store.getState().session).toMatchObject({ phase: 'running' });
    expect(phone.time.armed().length).toBeGreaterThan(0);

    server.online = true;
    await phone.store.dispatch({ type: 'connection_returned' });
    await phone.runner.settled();

    const state = phone.store.getState();
    expect(state.today).toEqual({ kind: 'crisis' });
    expect(state.session).toBeNull();
    expect(stageOf({ ...state, energyAsked: false })).toEqual({ kind: 'care' });
    expect(phone.time.armed()).toEqual([]);
    expect(phone.device.calls.live.at(-1)).toBe('end');
    expect(phone.device.scheduled()).toEqual([]);
    expect(await phone.repositories.tasks.all()).toEqual([]);
  });

  it('begins from words typed in the middle of a session, which are stored nowhere', async () => {
    const phone = await carePhone(careServer(pass));
    await phone.type('Email the dentist');
    await phone.store.dispatch({ type: 'one_thing_picked' });
    await phone.sit();

    await phone.session({ type: 'thought_parked', text: `and then ${explicitPhrase}` });
    await phone.runner.settled();

    const state = phone.store.getState();
    expect(state.today).toEqual({ kind: 'crisis' });
    expect(state.session).toBeNull();
    expect(phone.time.armed()).toEqual([]);
    expect(phone.data.dump()).not.toContain(explicitPhrase);
    // Nothing more is taken for the rest of the day.
    await phone.session({ type: 'finish_tapped' });
    expect(phone.store.getState().today).toEqual({ kind: 'crisis' });
  });
});

describe('the helpline table', () => {
  it('gives an unknown region no number, so the directory is what is shown', () => {
    expect(helplinesFor('ZZ')).toEqual([]);
    expect(helplinesFor(null)).toEqual([]);
    expect(helplinesFor('')).toEqual([]);
    expect(HELPLINE_DIRECTORY).toMatch(/^https:\/\//);
  });

  it('finds a region however the phone writes its code', () => {
    expect(helplinesFor('us').map((line) => line.number)).toEqual(['988']);
    expect(helplinesFor('IE')).toEqual(helplinesFor('GB'));
  });

  it('shows Vietnam the emergency number until a helpline has been verified', () => {
    expect(helplinesFor('VN')).toEqual([
      expect.objectContaining({ reach: 'emergency', number: '115' }),
    ]);
  });

  it('has a source and a checked date field on every row', () => {
    for (const line of HELPLINES) {
      expect(line.source).toMatch(/^https:\/\/\S+$/);
      expect(line).toHaveProperty('checkedOn');
      expect(line.number).toMatch(/^[\d ]+$/);
    }
  });
});
