import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import {
  createMotionRunner,
  runInSlices,
  runWhileVisible,
  TICK_HZ,
  type VisibilitySource,
} from './motion-runner';

/** The app's foreground state, as a switch the test flips. */
function appSwitch(active = true) {
  const listeners = new Set<(active: boolean) => void>();
  const source: VisibilitySource = {
    appActive: () => active,
    onAppActiveChange: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  return {
    source,
    listeners,
    set(next: boolean) {
      active = next;
      for (const listener of listeners) listener(next);
    },
  };
}

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

describe('the motion clock', () => {
  it('ticks only while running and picks up where it stopped', () => {
    const seen: number[] = [];
    const runner = createMotionRunner((seconds) => seen.push(seconds));
    expect(jest.getTimerCount()).toBe(0);

    runner.setRunning(true);
    runner.setRunning(true);
    expect(jest.getTimerCount()).toBe(1);
    jest.advanceTimersByTime(1000);
    expect(seen).toHaveLength(TICK_HZ);
    expect(seen.at(-1)).toBeCloseTo(1, 1);

    runner.setRunning(false);
    expect(jest.getTimerCount()).toBe(0);
    jest.advanceTimersByTime(60_000);
    expect(seen).toHaveLength(TICK_HZ);

    runner.setRunning(true);
    jest.advanceTimersByTime(500);
    // A minute away did not count: the motion goes on from one second.
    expect(seen.at(-1)).toBeCloseTo(1.5, 1);

    runner.dispose();
    runner.setRunning(true);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('holds one timer through a fifty-minute session and none after it', () => {
    let ticks = 0;
    const runner = createMotionRunner(() => ticks++);
    runner.setRunning(true);
    jest.advanceTimersByTime(50 * 60 * 1000);
    // Timers fire on whole milliseconds, so the count is a shade over twelve a second.
    expect(ticks).toBeGreaterThanOrEqual(50 * 60 * TICK_HZ);
    expect(ticks).toBeLessThan(50 * 60 * (TICK_HZ + 0.1));
    expect(jest.getTimerCount()).toBe(1);
    runner.dispose();
    expect(jest.getTimerCount()).toBe(0);
  });
});

describe('running only while it can be seen', () => {
  function shown() {
    const app = appSwitch();
    let ticks = 0;
    const gate = runWhileVisible(
      createMotionRunner(() => ticks++),
      app.source,
    );
    gate.setFocused(true);
    gate.setMoving(true);
    return { app, gate, ticks: () => ticks };
  }

  it('stops when the screen loses focus and starts again when it is back', () => {
    const { gate, ticks } = shown();
    jest.advanceTimersByTime(1000);
    expect(ticks()).toBe(TICK_HZ);

    gate.setFocused(false);
    expect(jest.getTimerCount()).toBe(0);
    jest.advanceTimersByTime(5000);
    expect(ticks()).toBe(TICK_HZ);

    gate.setFocused(true);
    jest.advanceTimersByTime(1000);
    expect(ticks()).toBe(TICK_HZ * 2);
    gate.dispose();
  });

  it('stops when the app goes to the background and starts again in the foreground', () => {
    const { app, gate, ticks } = shown();
    app.set(false);
    expect(jest.getTimerCount()).toBe(0);
    jest.advanceTimersByTime(5000);
    expect(ticks()).toBe(0);
    app.set(true);
    jest.advanceTimersByTime(1000);
    expect(ticks()).toBe(TICK_HZ);
    gate.dispose();
  });

  it('never starts for a still, or for a screen that opens in the background', () => {
    const still = shown();
    still.gate.setMoving(false);
    expect(jest.getTimerCount()).toBe(0);
    still.gate.dispose();

    const app = appSwitch(false);
    const gate = runWhileVisible(
      createMotionRunner(() => undefined),
      app.source,
    );
    gate.setFocused(true);
    gate.setMoving(true);
    expect(jest.getTimerCount()).toBe(0);
    gate.dispose();
  });

  it('leaves no timer and no listener behind when the character goes away', () => {
    const { app, gate } = shown();
    expect(app.listeners.size).toBe(1);
    gate.dispose();
    expect(jest.getTimerCount()).toBe(0);
    expect(app.listeners.size).toBe(0);
    app.set(true);
    expect(jest.getTimerCount()).toBe(0);
  });
});

describe('building frames a few at a time', () => {
  it('runs every job in order across pauses, then hands the results over once', () => {
    const order: number[] = [];
    const jobs = Array.from({ length: 10 }, (_, i) => () => {
      order.push(i);
      return i * 2;
    });
    const done = jest.fn();
    runInSlices(jobs, 4, done);
    expect(order).toEqual([]);
    jest.advanceTimersToNextTimer();
    expect(order).toEqual([0, 1, 2, 3]);
    expect(done).not.toHaveBeenCalled();
    jest.runAllTimers();
    expect(done).toHaveBeenCalledTimes(1);
    expect(done).toHaveBeenCalledWith([0, 2, 4, 6, 8, 10, 12, 14, 16, 18]);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('stops for good when cancelled halfway', () => {
    const ran: number[] = [];
    const done = jest.fn();
    const cancel = runInSlices(
      Array.from({ length: 10 }, (_, i) => () => ran.push(i)),
      4,
      done,
    );
    jest.advanceTimersToNextTimer();
    cancel();
    expect(jest.getTimerCount()).toBe(0);
    jest.runAllTimers();
    expect(ran).toHaveLength(4);
    expect(done).not.toHaveBeenCalled();
  });
});
