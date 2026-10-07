import { describe, expect, it } from '@jest/globals';

import { MINUTE_MS, sessionReducer, sessionSet, type SessionState } from '@scootch/domain';

import {
  NOTHING_PASSED,
  discScale,
  finishControl,
  minutesLeft,
  sessionView,
  timeLeftFraction,
  type SessionViewInput,
} from './session-view';

const START = Date.parse('2026-10-06T09:00:00.000Z');

function started(tone: 'full' | 'quiet', treat: string | null = 'coffee'): SessionState {
  const set = sessionSet({ taskId: 'task', tone, minutes: 10, treat });
  return sessionReducer(set, { type: 'started' }, START).state;
}

const input = (changes: Partial<SessionViewInput>): SessionViewInput => ({
  session: null,
  burst: null,
  treat: null,
  parkedThoughts: [],
  finishWith: 'hold',
  passed: NOTHING_PASSED,
  ...changes,
});

describe('which session screen is on', () => {
  it('opens an ordinary session on the burst, then goes quiet', () => {
    const session = started('full');
    expect(sessionView(input({ session, burst: 'start' })).kind).toBe('burst');
    expect(
      sessionView(input({ session, burst: 'start', passed: { ...NOTHING_PASSED, burst: true } })),
    ).toMatchObject({ kind: 'working', quiet: false });
    // After a relaunch the store has no burst to show: straight to the running screen.
    expect(sessionView(input({ session })).kind).toBe('working');
  });

  it('never shows a serious task the burst, the hold or the treat', () => {
    const session = started('quiet');
    // Even if a burst or a treat were handed over, a serious session shows neither.
    expect(sessionView(input({ session, burst: 'start', treat: 'coffee' }))).toMatchObject({
      kind: 'working',
      quiet: true,
    });

    const timeUp = sessionReducer(session, { type: 'clock' }, START + 10 * MINUTE_MS).state;
    expect(sessionView(input({ session: timeUp }))).toMatchObject({
      kind: 'working',
      quiet: true,
      timeUp: true,
    });

    const done = sessionReducer(session, { type: 'finish_tapped' }, START + MINUTE_MS).state;
    const after = input({ session: done, burst: 'confetti', treat: 'coffee' });
    expect(sessionView(after)).toEqual({ kind: 'moment', quiet: true });
    expect(sessionView({ ...after, passed: { ...NOTHING_PASSED, moment: true } })).toEqual({
      kind: 'home',
    });
  });

  it('offers the finish when time is up, and before it only when asked', () => {
    const session = started('full');
    const passed = { ...NOTHING_PASSED, burst: true };
    expect(sessionView(input({ session, passed })).kind).toBe('working');
    expect(sessionView(input({ session, passed: { ...passed, finishingEarly: true } }))).toEqual({
      kind: 'finish',
      control: 'hold',
      timeUp: false,
    });
    const timeUp = sessionReducer(session, { type: 'clock' }, START + 10 * MINUTE_MS).state;
    expect(sessionView(input({ session: timeUp, passed, finishWith: 'double_tap' }))).toEqual({
      kind: 'finish',
      control: 'double_tap',
      timeUp: true,
    });
  });

  it('gives someone who says "done" a control that needs no holding', () => {
    expect(finishControl('voice')).toBe('double_tap');
    expect(finishControl('hold')).toBe('hold');
  });

  it('walks the treat, then the parked thoughts, then home, each passed with one tap', () => {
    const running = started('full');
    const parked = sessionReducer(running, { type: 'thought_parked', text: 'bin bags' }, START);
    const done = sessionReducer(parked.state, { type: 'double_tapped' }, START + MINUTE_MS).state;
    const thoughts = [{ text: 'bin bags', parkedAt: START }];
    const base = input({
      session: done,
      burst: 'confetti',
      treat: 'coffee',
      parkedThoughts: thoughts,
    });

    expect(sessionView(base)).toEqual({ kind: 'treat', treat: 'coffee' });
    const afterTreat = { ...NOTHING_PASSED, treat: true };
    expect(sessionView({ ...base, passed: afterTreat })).toEqual({ kind: 'thoughts', thoughts });
    expect(sessionView({ ...base, passed: { ...afterTreat, thoughts: true } })).toEqual({
      kind: 'home',
    });
    // With no treat named, the caught line has a moment of its own instead.
    expect(sessionView({ ...base, treat: null })).toEqual({ kind: 'moment', quiet: false });
    // Settling the last thought empties the list, and an empty list is not shown: home comes by
    // itself, so nobody is left looking at a "Done" with nothing above it.
    expect(sessionView({ ...base, passed: afterTreat, parkedThoughts: [] })).toEqual({
      kind: 'home',
    });
  });

  it('hands a finish to the reveal first, then the treat, and never a serious one', () => {
    const done = sessionReducer(started('full'), { type: 'double_tapped' }, START + MINUTE_MS);
    const base = input({ session: done.state, burst: 'confetti', treat: 'coffee' });
    expect(sessionView({ ...base, reveal: 'pending' })).toEqual({ kind: 'reveal' });
    expect(sessionView({ ...base, reveal: 'seen' })).toEqual({ kind: 'treat', treat: 'coffee' });
    // The reveal has said the caught line already: with no treat there is nothing more to show.
    expect(sessionView({ ...base, treat: null, reveal: 'seen' })).toEqual({ kind: 'home' });

    const quiet = sessionReducer(started('quiet'), { type: 'finish_tapped' }, START + MINUTE_MS);
    for (const reveal of ['pending', 'seen'] as const) {
      expect(sessionView(input({ session: quiet.state, reveal }))).toEqual({
        kind: 'moment',
        quiet: true,
      });
    }
  });

  it('goes home without a word when the person leaves early', () => {
    const left = sessionReducer(started('full'), { type: 'left' }, START + MINUTE_MS).state;
    expect(sessionView(input({ session: left }))).toEqual({ kind: 'home' });
  });
});

describe('the disc', () => {
  it('reads whole minutes left, rounded up, and nothing once time is up', () => {
    const session = { startedAt: START, endsAt: START + 10 * MINUTE_MS };
    expect(minutesLeft(session, START)).toBe(10);
    expect(minutesLeft(session, START + 3 * MINUTE_MS + 1)).toBe(7);
    expect(minutesLeft(session, START + 10 * MINUTE_MS - 1)).toBe(1);
    expect(minutesLeft(session, START + 11 * MINUTE_MS)).toBe(0);
  });

  it('only ever shrinks, by area, from full to nothing', () => {
    const session = { startedAt: START, endsAt: START + 10 * MINUTE_MS };
    const scales = [0, 2, 5, 8, 10, 12].map((minute) =>
      discScale(timeLeftFraction(session, START + minute * MINUTE_MS)),
    );
    expect(scales[0]).toBe(1);
    expect(scales.at(-1)).toBe(0);
    expect([...scales].sort((a, b) => b - a)).toEqual(scales);
    expect(discScale(0.25)).toBeCloseTo(0.5);
  });
});
