import { describe, expect, it } from '@jest/globals';

import { MINUTE_MS, sessionReducer, sessionSet, type LiveSession } from '@scootch/domain';
import { CUES } from '@scootch/sound';

import { fakeRunner, fakeTime } from './test/fake-adapters';
import { createTapScheduler } from './tap-scheduler';

const START = Date.parse('2026-10-06T09:00:00.000Z');
const hold = CUES['hold-rising']?.haptics ?? [];

describe('a pattern of haptic taps', () => {
  it('plays each tap at its own time', () => {
    const time = fakeTime(START);
    const felt: number[] = [];
    const taps = createTapScheduler(time.timers, (tap) => felt.push(tap.atMs));
    taps.play(hold, 'hold-rising');
    time.advanceTo(START + 2000);
    expect(felt).toEqual(hold.map((tap) => tap.atMs));
  });

  it('stops tapping the moment the hold is let go, the final pop included', () => {
    const time = fakeTime(START);
    const felt: number[] = [];
    const taps = createTapScheduler(time.timers, (tap) => felt.push(tap.atMs));
    taps.play(hold, 'hold-rising');
    time.advanceTo(START + 600);
    const before = felt.length;
    expect(before).toBeGreaterThan(0);
    expect(before).toBeLessThan(hold.length);

    taps.stop('hold-rising');
    time.advanceTo(START + 5000);
    expect(felt.length).toBe(before);
    expect(time.armed()).toEqual([]);
  });

  it('starts over when the hold is pressed again, with no taps left from the first press', () => {
    const time = fakeTime(START);
    const felt: number[] = [];
    const taps = createTapScheduler(time.timers, (tap) => felt.push(tap.atMs));
    taps.play(hold, 'hold-rising');
    time.advanceTo(START + 400);
    taps.play(hold, 'hold-rising');
    expect(time.armed().length).toBe(hold.length);
  });

  it('leaves another pattern alone', () => {
    const time = fakeTime(START);
    const felt: string[] = [];
    const taps = createTapScheduler(time.timers, () => felt.push('tap'));
    taps.play([{ atMs: 100, durationMs: 20, intensity: 1, sharpness: 1 }], 'finish');
    taps.stop('hold-rising');
    time.advanceTo(START + 200);
    expect(felt).toEqual(['tap']);
  });
});

describe('letting go of the hold', () => {
  it('stops the hold sound and its haptics together', () => {
    const harness = fakeRunner(START);
    const context = { title: 'Call the plumber', liveLine: '', lineFor: () => null };
    let session: LiveSession = sessionSet({ taskId: 't', tone: 'full', minutes: 25, treat: null });
    for (const type of ['started', 'finish_tapped', 'hold_started', 'hold_released'] as const) {
      const step = sessionReducer(session, { type }, START + MINUTE_MS);
      harness.runner.run(step.effects, context);
      if (step.state.phase === 'let_go') throw new Error('the task was let go');
      session = step.state;
    }
    expect(harness.device.calls.stopped).toEqual(['hold-rising']);
    expect(harness.device.calls.hapticsStopped).toEqual(['hold-rising']);
  });
});
