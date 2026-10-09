import { describe, expect, it } from '@jest/globals';

import type { Attitude, StartCue, TaskCreateStartResponse } from '@scootch/domain';
import { helperLine } from '@scootch/voice';

import seriousFixture from '../../../../packages/voice/fixtures/task.create.serious.en.json';
import { DEFAULT_ACTION, askOf } from '../features/surfaces/notification-responses';

import { MORNING, recordedLines, stagedPhone, stagedServer } from './test/staged-phone';

type Phone = Awaited<ReturnType<typeof stagedPhone>>;

const LUNCH: StartCue = { kind: 'moment', moment: 'lunch' };
// 13:10 in London on the recorded day, the default hour of lunch.
const LUNCH_AT = Date.parse('2026-10-06T12:10:00.000Z');
const TOMORROW = Date.parse('2026-10-07T03:00:00.000Z');
// 8:00 in London: the day's own lines, from 10:00, are all still ahead.
const EARLY = MORNING - 2 * 60 * 60 * 1000;
const serious = seriousFixture.response as TaskCreateStartResponse;
const seriousText = seriousFixture.response.oneThing.text;

async function taskSet(app: Phone, attitude: Attitude): Promise<void> {
  await app.store.dispatch({ type: 'settings_changed', changes: { attitude } });
  await app.say('ring the bank', 'typed');
  await app.store.dispatch({ type: 'one_thing_picked' });
  await app.store.dispatch({ type: 'monster_met' });
}

/** What is waiting to go out today. */
function todays(app: Phone) {
  return app.device.scheduled().filter((one) => one.at < TOMORROW);
}

/** A server whose line pack wrote no message for a cue: the offline line says it. */
const { cueNotification: recordedCue, ...unwritten } = recordedLines;
const withoutCueLine = () => stagedServer({ lines: () => Promise.resolve(unwritten) });

const cueText = (attitude: Attitude | 'plain') =>
  (attitude === 'plain'
    ? helperLine('en', 'plain', 'cue')
    : helperLine('en', attitude, 'cue')
  ).replace('{cue}', 'After lunch');

describe('a cue saved for later', () => {
  it('takes one of the day’s places at Soft: one message in all, at the cue, saying it back', async () => {
    const app = await stagedPhone(withoutCueLine(), undefined, EARLY);
    await taskSet(app, 'soft');
    expect(todays(app)).toHaveLength(1);
    const own = todays(app)[0]?.text;

    await app.store.dispatch({ type: 'cue_saved', cue: LUNCH });
    expect(app.task().startCue).toEqual(LUNCH);
    expect(app.store.getState().today.kind).toBe('task_set');
    expect(app.store.getState().session).toBeNull();
    const planned = todays(app);
    expect(planned).toHaveLength(1);
    expect(planned[0]).toMatchObject({
      at: LUNCH_AT,
      text: cueText('soft'),
      taskId: app.task().id,
    });
    // The message is the start button itself: nothing hangs under it.
    expect(planned[0]?.actions ?? false).toBe(false);
    expect(planned.some((one) => one.text === own)).toBe(false);
  });

  it('replaces a message at Cheeky and never adds one', async () => {
    const app = await stagedPhone(withoutCueLine(), undefined, EARLY);
    await taskSet(app, 'cheeky');
    const before = todays(app).length;
    expect(before).toBe(3);
    await app.store.dispatch({ type: 'cue_saved', cue: LUNCH });
    const planned = todays(app);
    expect(planned).toHaveLength(before);
    expect(planned.filter((one) => one.text === cueText('cheeky'))).toHaveLength(1);
  });

  it('is taken away with its message by "Now"', async () => {
    const app = await stagedPhone(withoutCueLine(), undefined, EARLY);
    await taskSet(app, 'cheeky');
    await app.store.dispatch({ type: 'cue_saved', cue: LUNCH });
    await app.store.dispatch({ type: 'cue_cleared' });
    expect(app.task().startCue ?? null).toBeNull();
    expect(todays(app).some((one) => one.text === cueText('cheeky'))).toBe(false);
  });

  it('is spent by starting: the cue and its message are gone', async () => {
    const app = await stagedPhone(withoutCueLine(), undefined, EARLY);
    await taskSet(app, 'soft');
    await app.store.dispatch({ type: 'cue_saved', cue: LUNCH });
    await app.store.dispatch({ type: 'session_set', minutes: 25 });
    await app.store.dispatch({ type: 'session', event: { type: 'started' } });
    expect(app.task().startCue ?? null).toBeNull();
    expect(todays(app).some((one) => one.text === cueText('soft'))).toBe(false);
  });

  it('starts the session from one tap on its message, with no screen on the way', async () => {
    const app = await stagedPhone(withoutCueLine(), undefined, EARLY);
    await taskSet(app, 'soft');
    await app.store.dispatch({ type: 'cue_saved', cue: LUNCH });
    const [message] = todays(app);
    if (message === undefined) throw new Error('the cue is planned');
    app.time.advanceTo(LUNCH_AT);

    const ask = askOf({
      actionIdentifier: DEFAULT_ACTION,
      notification: { request: { content: { data: { taskId: message.taskId } } } },
    });
    expect(ask).toEqual({ kind: 'hunt', taskId: app.task().id });
    // What the app does with that ask, as the surface host does it.
    await app.store.dispatch({ type: 'surface_action', action: 'start_session' });
    expect(app.store.getState().session).toMatchObject({ phase: 'running' });
    expect(app.device.calls.cues.filter((cue) => cue === 'start-burst')).toHaveLength(1);
    expect(app.task().startCue ?? null).toBeNull();
  });

  it('on a serious thing is said in plain words, signed by no monster', async () => {
    const app = await stagedPhone(stagedServer({ start: serious }), undefined, EARLY);
    await app.say(seriousText, 'typed');
    await app.store.dispatch({ type: 'one_thing_picked' });
    expect(app.store.getState().today.kind).toBe('serious');
    await app.store.dispatch({ type: 'cue_saved', cue: LUNCH });
    const planned = todays(app);
    expect(planned).toHaveLength(1);
    expect(planned[0]).toMatchObject({ at: LUNCH_AT, text: cueText('plain') });
    expect(planned[0]?.from).toBeUndefined();
  });
});

describe("the cue's own words", () => {
  // The recorded pack wrote one; without it the test would compare against no line at all.
  const written = (recordedCue?.text ?? 'no recorded cue line').replace('{cue}', 'After lunch');

  it('are the ones the task call wrote, kept with the thing, with the cue said back', async () => {
    const app = await stagedPhone(stagedServer(), undefined, EARLY);
    await taskSet(app, 'cheeky');
    await app.store.dispatch({ type: 'cue_saved', cue: LUNCH });
    expect(todays(app).filter((one) => one.at === LUNCH_AT)).toEqual([
      expect.objectContaining({ text: written, taskId: app.task().id }),
    ]);
    expect(todays(app).some((one) => one.text === cueText('cheeky'))).toBe(false);

    // Opened again, offline: the line was stored with the thing.
    const again = await stagedPhone(stagedServer({ online: false }), app.data, EARLY + 60_000);
    expect(todays(again).filter((one) => one.at === LUNCH_AT)[0]?.text).toBe(written);
  });

  it('give way to the soft offline line once the monster is turned down', async () => {
    const app = await stagedPhone(stagedServer(), undefined, EARLY);
    await taskSet(app, 'cheeky');
    await app.store.dispatch({ type: 'cue_saved', cue: LUNCH });
    await app.store.dispatch({ type: 'monster_turned_down', taskId: app.task().id });
    const [cue] = todays(app).filter((one) => one.at === LUNCH_AT);
    expect(cue?.text).toBe(cueText('soft'));
  });
});

describe('what is in the way', () => {
  it('is sent with the first stage only, kept with the thing, and the phone’s clock goes with it', async () => {
    const server = stagedServer();
    const app = await stagedPhone(server);
    await app.store.dispatch({
      type: 'text_submitted',
      text: 'ring the bank',
      source: 'typed',
      energy: 'low',
      inTheWay: 'scary',
    });
    expect(server.asked).toHaveLength(1);
    expect(server.asked[0]).toMatchObject({ inTheWay: 'scary', localTime: '10:00' });
    await app.store.dispatch({ type: 'one_thing_picked' });
    expect(app.task().inTheWay).toBe('scary');
  });

  it('is never sent or kept for a serious thing', async () => {
    const server = stagedServer({ start: serious });
    const app = await stagedPhone(server);
    await app.store.dispatch({
      type: 'text_submitted',
      text: seriousText,
      source: 'typed',
      energy: 'low',
      inTheWay: 'boring',
    });
    expect(app.store.getState().today.kind).toBe('serious');
    expect(app.task().inTheWay ?? null).toBeNull();
  });

  it('is not sent on a day that already holds something heavy', async () => {
    const server = stagedServer({ start: serious });
    const app = await stagedPhone(server);
    await app.say(seriousText, 'typed');
    await app.store.dispatch({ type: 'serious_set_aside' });
    expect(app.store.getState().heavyToday).toBe(true);
    await app.store.dispatch({
      type: 'text_submitted',
      text: 'water the plants',
      source: 'typed',
      energy: 'guess',
      inTheWay: 'boring',
    });
    expect(server.asked.at(-1)?.inTheWay).toBeUndefined();
    expect(server.asked.at(-1)?.localTime).toBe('10:00');
  });
});
