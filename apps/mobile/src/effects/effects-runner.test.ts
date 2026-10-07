import { describe, expect, it } from '@jest/globals';

import {
  MINUTE_MS,
  sessionReducer,
  sessionSet,
  type LiveSession,
  type SessionEvent,
  type SessionLine,
} from '@scootch/domain';
import { CUES } from '@scootch/sound';

import type { SessionContext } from './adapters';
import { ALL_ON, fakeRunner } from './test/fake-adapters';

const START = Date.parse('2026-10-06T09:00:00.000Z');
const END = START + 25 * MINUTE_MS;

const context: SessionContext = {
  title: 'Call the plumber',
  liveLine: 'Holding the bucket.',
  lineFor: (slot: SessionLine) => (slot === 'thoughtParked' ? null : `the ${slot} line`),
};

const set = (tone: 'full' | 'quiet' = 'full') =>
  sessionSet({ taskId: 'task-1', tone, minutes: 25, treat: 'a coffee' });

/** Runs events through the real session reducer and hands each step's effects to the runner. */
function drive(
  harness: ReturnType<typeof fakeRunner>,
  state: LiveSession,
  events: readonly SessionEvent[],
) {
  let current = state;
  for (const event of events) {
    const step = sessionReducer(current, event, harness.time.clock.now());
    harness.runner.run(step.effects, context);
    if (step.state.phase === 'let_go') throw new Error('the task was let go');
    current = step.state;
  }
  return current;
}

describe('the effects runner', () => {
  it('turns a session start into timers, the cue, its haptics, the Live Activity and a line', async () => {
    const harness = fakeRunner(START);
    drive(harness, set(), [{ type: 'started' }]);
    await harness.runner.settled();

    // The check-in half-way, the warning two minutes before the end, and the end itself.
    expect(harness.time.armed()).toEqual([START + 12.5 * MINUTE_MS, END - 2 * MINUTE_MS, END]);
    expect(harness.device.calls.cues).toEqual(['start-burst']);
    expect(harness.device.calls.haptics).toEqual([CUES['start-burst']?.haptics]);
    expect(harness.device.calls.bursts).toEqual(['start']);
    expect(harness.device.calls.lines).toEqual(['start: the start line']);
    expect(harness.device.calls.live).toEqual([
      `start Call the plumber until ${END}: Holding the bucket.`,
      'update: the start line',
    ]);
  });

  it('lets a parked thought be felt as well as heard, and felt alone with sound effects off', () => {
    const parked = { type: 'thought_parked', text: 'ring the vet' } as const;
    const heard = fakeRunner(START);
    const running = drive(heard, set(), [{ type: 'started' }]);
    heard.device.calls.haptics.length = 0;
    drive(heard, running, [parked]);
    expect(heard.device.calls.cues).toContain('park-a-thought');
    expect(heard.device.calls.haptics).toEqual([CUES['park-a-thought']?.haptics]);

    const muted = fakeRunner(START, () => ({ ...ALL_ON, effects: false }));
    const quiet = drive(muted, set(), [{ type: 'started' }]);
    muted.device.calls.haptics.length = 0;
    drive(muted, quiet, [parked]);
    expect(muted.device.calls.cues).toEqual([]);
    expect(muted.device.calls.haptics).toEqual([CUES['park-a-thought']?.haptics]);
  });

  it('asks for a clock event when each moment comes due, and plays the warning then', async () => {
    const harness = fakeRunner(START);
    let session = drive(harness, set(), [{ type: 'started' }]);

    harness.time.advanceTo(END - 2 * MINUTE_MS);
    expect(harness.fired.clockEvents).toBe(2);
    session = drive(harness, session, [{ type: 'clock' }]);
    expect(harness.device.calls.cues).toContain('two-minutes-left');

    harness.time.advanceTo(END);
    expect(harness.fired.clockEvents).toBe(3);
    drive(harness, session, [{ type: 'clock' }]);
    await harness.runner.settled();
    expect(harness.time.armed()).toEqual([]);
    expect(harness.device.calls.live.at(-1)).toBe('end');
  });

  it('stays silent and still when sound and haptics are switched off', () => {
    const harness = fakeRunner(START, () => ({
      effects: false,
      haptics: false,
      reducedMotion: false,
    }));
    const session = drive(harness, set(), [{ type: 'started' }, { type: 'hold_started' }]);
    drive(harness, session, [{ type: 'hold_completed' }]);

    expect(harness.device.calls.cues).toEqual([]);
    expect(harness.device.calls.haptics).toEqual([]);
    // The line and the treat are not sound: they still arrive.
    expect(harness.device.calls.lines).toContain('caught: the caught line');
    expect(harness.device.calls.treats).toEqual(['a coffee']);
  });

  it('plays only the first tap of a pattern when motion is reduced', () => {
    const harness = fakeRunner(START, () => ({ ...ALL_ON, reducedMotion: true }));
    drive(harness, set(), [{ type: 'started' }]);

    const pattern = CUES['start-burst']?.haptics ?? [];
    expect(pattern.length).toBeGreaterThan(1);
    expect(harness.device.calls.haptics).toEqual([pattern.slice(0, 1)]);
    expect(harness.device.calls.cues).toEqual(['start-burst']);
  });

  it('gives a serious task no burst and no start cue, and the quiet cue at the finish', () => {
    const harness = fakeRunner(START);
    const session = drive(harness, set('quiet'), [{ type: 'started' }]);
    expect(harness.device.calls.cues).toEqual([]);
    expect(harness.device.calls.bursts).toEqual([]);

    drive(harness, session, [{ type: 'finish_tapped' }]);
    expect(harness.device.calls.cues).toEqual(['quiet-finish']);
    expect(harness.device.calls.bursts).toEqual([]);
    expect(harness.time.armed()).toEqual([]);
  });

  it('re-arms the timers from the stored end time after a relaunch, and grants nothing twice', async () => {
    const first = fakeRunner(START);
    const running = drive(first, set(), [{ type: 'started' }]);

    // The app is killed. Five minutes later a new process has only what was stored.
    const relaunchAt = START + 5 * MINUTE_MS;
    const second = fakeRunner(relaunchAt);
    const stored: LiveSession = { ...running, inForeground: false };
    const step = sessionReducer(stored, { type: 'relaunched' }, relaunchAt);
    second.runner.run(step.effects, context);
    await second.runner.settled();

    expect(second.time.armed()).toEqual([START + 12.5 * MINUTE_MS, END - 2 * MINUTE_MS, END]);
    expect(step.effects.map((effect) => effect.kind)).not.toEqual(
      expect.arrayContaining(['grant_start_reward']),
    );
    expect(second.device.calls.cues).toEqual([]);
    expect(second.device.calls.haptics).toEqual([]);
    expect(second.device.calls.bursts).toEqual([]);
    expect(second.device.calls.live).toEqual([]);

    // The end still comes at the stored instant, not twenty-five minutes after the relaunch.
    second.time.advanceTo(END - 1);
    expect(second.fired.clockEvents).toBe(2);
    second.time.advanceTo(END);
    expect(second.fired.clockEvents).toBe(3);
  });

  it('lands on the same moments after time passed in the background', () => {
    const harness = fakeRunner(START);
    drive(harness, set(), [{ type: 'started' }]);

    // Timers do not run in the background: the clock moves and nothing fires.
    harness.time.jumpTo(START + 24 * MINUTE_MS);
    harness.runner.resync();
    expect(harness.time.armed()).toEqual([START + 24 * MINUTE_MS, START + 24 * MINUTE_MS, END]);
    harness.time.advanceTo(START + 24 * MINUTE_MS);
    expect(harness.fired.clockEvents).toBe(2);
  });

  it('schedules the day plan, leaves an unchanged plan alone and replaces a changed one', async () => {
    const harness = fakeRunner(START);
    const plan = [
      { at: START - MINUTE_MS, text: 'already past' },
      { at: START + 60 * MINUTE_MS, text: 'first' },
      { at: START + 105 * MINUTE_MS, text: 'second' },
    ];
    await harness.runner.syncNotifications(plan);
    expect(harness.device.scheduled().map((one) => one.text)).toEqual(['first', 'second']);

    await harness.runner.syncNotifications([...plan]);
    expect(harness.device.calls.scheduleCalls).toBe(2);

    await harness.runner.syncNotifications([{ at: START + 90 * MINUTE_MS, text: 'only' }]);
    expect(harness.device.scheduled().map((one) => one.text)).toEqual(['only']);

    await harness.runner.syncNotifications([]);
    expect(harness.device.scheduled()).toEqual([]);
  });
});
