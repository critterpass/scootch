import { describe, expect, it } from '@jest/globals';

import { MINUTE_MS, sessionReducer, sessionSet, type SessionState } from '@scootch/domain';

import {
  NOTHING_PASSED,
  closeMeans,
  discShare,
  finishControl,
  minutesLeft,
  scootchShare,
  sessionView,
  timeLeftFraction,
  type SessionViewInput,
  catchPlays,
  catchable,
  finishedByHand,
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
      control: 'double_tap',
      timeUp: false,
    });
    // With a monster that can be caught by hand, the finish is the catch.
    expect(
      sessionView(input({ session, passed: { ...passed, finishingEarly: true }, catchable: true })),
    ).toEqual({ kind: 'finish', control: 'catch', timeUp: false });
    const timeUp = sessionReducer(session, { type: 'clock' }, START + 10 * MINUTE_MS).state;
    expect(sessionView(input({ session: timeUp, passed, finishWith: 'double_tap' }))).toEqual({
      kind: 'finish',
      control: 'double_tap',
      timeUp: true,
    });
  });

  it('gives someone who says "done" a control that needs no holding', () => {
    expect(finishControl('voice')).toBe('double_tap');
    expect(finishControl('double_tap')).toBe('double_tap');
    expect(finishControl('hold')).toBe('catch');
    // Nothing to catch by hand: no monster, a screen reader, or motion that may not play.
    expect(finishControl('hold', false)).toBe('double_tap');
    expect(catchable({ monster: true, screenReader: false, reducedMotion: false })).toBe(true);
    expect(catchable({ monster: false, screenReader: false, reducedMotion: false })).toBe(false);
    expect(catchable({ monster: true, screenReader: true, reducedMotion: false })).toBe(false);
    expect(catchable({ monster: true, screenReader: false, reducedMotion: true })).toBe(false);
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

describe('the close control', () => {
  it('asks before leaving a running session, so one tap never ends it', () => {
    const running = started('full');
    const burst = sessionView(input({ session: running, burst: 'start' }));
    const working = sessionView(input({ session: running }));
    expect(burst.kind).toBe('burst');
    expect(working.kind).toBe('working');
    expect(closeMeans(burst)).toBe('ask');
    expect(closeMeans(working)).toBe('ask');
    // Asking changes nothing: the session is still running behind the question.
    expect(running.phase).toBe('running');
  });

  it('asks while stuck help is open, too', () => {
    const stuck = sessionReducer(started('full'), { type: 'stuck_tapped' }, START + MINUTE_MS);
    expect(closeMeans(sessionView(input({ session: stuck.state })))).toBe('ask');
  });

  it('simply stops a quiet session, where nothing is ever asked of the person', () => {
    expect(closeMeans(sessionView(input({ session: started('quiet') })))).toBe('leave');
  });

  it('simply closes once the session is over', () => {
    expect(closeMeans({ kind: 'home' })).toBe('leave');
    expect(closeMeans({ kind: 'thoughts', thoughts: [] })).toBe('leave');
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

  it('only ever shrinks, in a straight line as the board draws it, from full to nothing', () => {
    const session = { startedAt: START, endsAt: START + 10 * MINUTE_MS };
    const shares = [0, 2, 5, 8, 10, 12].map((minute) =>
      discShare(timeLeftFraction(session, START + minute * MINUTE_MS)),
    );
    expect(shares[0]).toBeCloseTo(316 / 330);
    expect(shares.at(-1)).toBe(0);
    expect([...shares].sort((a, b) => b - a)).toEqual(shares);
    // The board's two drawn moments of a ten-minute session, in points of a 330-point ring.
    expect(discShare(0.7) * 330).toBeCloseTo(232);
    expect(discShare(0.2) * 330).toBeCloseTo(92);
    expect(scootchShare(0.7) * 330).toBeCloseTo(200);
    expect(scootchShare(0.2) * 330).toBeCloseTo(180);
  });
});

describe('the catch, between a finish made by hand and the reveal', () => {
  const done = sessionReducer(started('full'), { type: 'double_tapped' }, START + MINUTE_MS);
  const base = input({ session: done.state, burst: 'confetti', reveal: 'pending' });

  it('keeps the finish screen up until the moment has played or is tapped away', () => {
    expect(sessionView({ ...base, caught: true, catchable: true })).toEqual({
      kind: 'caught',
      control: 'catch',
    });
    expect(sessionView({ ...base, caught: true })).toEqual({
      kind: 'caught',
      control: 'double_tap',
    });
    expect(sessionView({ ...base, caught: true, finishWith: 'voice' })).toEqual({
      kind: 'caught',
      control: 'double_tap',
    });
    const passed = { ...NOTHING_PASSED, caught: true };
    expect(sessionView({ ...base, caught: true, passed })).toEqual({ kind: 'reveal' });
  });

  it('is skipped when it may not play, and after a relaunch, which goes straight to the reveal', () => {
    expect(sessionView({ ...base, caught: false })).toEqual({ kind: 'reveal' });
    expect(sessionView(base)).toEqual({ kind: 'reveal' });
    for (const [motion, crisis] of [
      [true, false],
      [false, true],
      [true, true],
    ] as const) {
      expect(catchPlays({ byHand: true, reducedMotion: motion, crisis })).toBe(false);
    }
    expect(catchPlays({ byHand: false, reducedMotion: false, crisis: false })).toBe(false);
    expect(catchPlays({ byHand: true, reducedMotion: false, crisis: false })).toBe(true);
  });

  it('never shows for a quiet session, and changes nothing once the reveal has been seen', () => {
    const quiet = sessionReducer(started('quiet'), { type: 'finish_tapped' }, START + MINUTE_MS);
    expect(sessionView(input({ session: quiet.state, reveal: 'pending', caught: true }))).toEqual({
      kind: 'moment',
      quiet: true,
    });
    expect(sessionView({ ...base, caught: true, reveal: 'seen' })).toEqual({ kind: 'home' });
  });

  it('counts a catch, a completed hold and a second tap as finishes by hand, and nothing else', () => {
    expect(finishedByHand({ type: 'caught' })).toBe(true);
    expect(finishedByHand({ type: 'hold_completed' })).toBe(true);
    expect(finishedByHand({ type: 'double_tapped' })).toBe(true);
    expect(finishedByHand({ type: 'said_done' })).toBe(false);
    expect(finishedByHand({ type: 'hold_started' })).toBe(false);
  });
});

describe('a session that ends in a catch', () => {
  const passed = { ...NOTHING_PASSED, burst: true };

  it('shows the work as the trap setting itself, and a serious task never does', () => {
    const view = sessionView(input({ session: started('full'), passed, catchable: true }));
    expect(view).toMatchObject({ kind: 'working', trap: true });
    const tapped = input({
      session: started('full'),
      passed,
      catchable: true,
      finishWith: 'voice',
    });
    expect(sessionView(tapped)).toMatchObject({ kind: 'working', trap: false });
    expect(
      sessionView(input({ session: started('quiet'), passed, catchable: true })),
    ).toMatchObject({ kind: 'working', trap: false });
  });

  it('explains catching before the very first start, and only where there is a catch', () => {
    const set = sessionSet({ taskId: 'task', tone: 'full', minutes: 10 });
    expect(sessionView(input({ session: set, coach: true, catchable: true }))).toEqual({
      kind: 'coach',
    });
    expect(sessionView(input({ session: set, catchable: true }))).toEqual({ kind: 'starting' });
    expect(sessionView(input({ session: set, coach: true }))).toEqual({ kind: 'starting' });
    const quiet = sessionSet({ taskId: 'task', tone: 'quiet', minutes: 10 });
    expect(sessionView(input({ session: quiet, coach: true, catchable: true }))).toEqual({
      kind: 'starting',
    });
  });
});
