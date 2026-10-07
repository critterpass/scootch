import { describe, expect, it } from 'vitest';

import { sessionReducer, sessionTone, visibleThoughts } from './session-reducer';
import type { LiveSession, SessionEvent } from './session-types';
import { T0, each, endOf, minutes, setFor, walk } from './test/session-walk';

const END = T0 + minutes(10);
const started = (tone: 'full' | 'quiet' = 'full', length = 10) =>
  sessionReducer(setFor(tone, length), { type: 'started' }, T0).state as LiveSession;
const at = (state: LiveSession, type: SessionEvent['type'], offset: number) =>
  sessionReducer(state, { type } as SessionEvent, T0 + offset);

describe('before the start', () => {
  it('takes the quiet path for a serious task unless the user asked for the comedy', () => {
    expect(sessionTone({ screen: 'serious', seriousOverridden: false })).toBe('quiet');
    expect(sessionTone({ screen: 'serious', seriousOverridden: true })).toBe('full');
    expect(sessionTone({ screen: 'pass', seriousOverridden: false })).toBe('full');
    expect(sessionTone({ screen: 'unscreened', seriousOverridden: false })).toBe('full');
  });

  it.each([
    [10, 10],
    [5, 5],
    [50, 25],
    [0, 1],
    [-3, 1],
    [7.9, 7],
    [Number.NaN, 25],
  ])('a bargain for %d minutes on a 25 minute ask leaves %d', (offer, left) => {
    const step = sessionReducer(setFor('full', 25), { type: 'bargained', minutes: offer }, T0);
    expect(step).toMatchObject({ state: { ask: { minutes: left, shrinkCount: 0 } }, effects: [] });
  });

  it('shrinks the task and the monster on "too big", keeping the length', () => {
    const step = sessionReducer(setFor(), { type: 'too_big' }, T0);
    expect(step.state).toMatchObject({ phase: 'set', ask: { minutes: 10, shrinkCount: 1 } });
    expect(step.effects).toEqual([
      { kind: 'shrink_task', taskId: 'task-molar' },
      { kind: 'play_cue', cue: 'shrink' },
    ]);
  });
});

describe('starting', () => {
  it('sets an end time and rewards the start at once', () => {
    const step = sessionReducer(setFor(), { type: 'started' }, T0);
    expect(step.state).toMatchObject({ phase: 'running', startedAt: T0, endsAt: END });
    expect(step.effects).toEqual([
      { kind: 'start_timer', until: END },
      { kind: 'schedule_warning', at: T0 + minutes(8) },
      { kind: 'schedule_check_in', at: T0 + minutes(5) },
      { kind: 'start_live_activity', until: END },
      { kind: 'grant_start_reward', taskId: 'task-molar', tone: 'full' },
      { kind: 'show_burst', burst: 'start' },
      { kind: 'play_cue', cue: 'start-burst' },
      { kind: 'haptic', pattern: 'start-burst' },
      { kind: 'show_line', line: 'start' },
    ]);
  });

  it('starts a serious task with the same timers and reward, and no burst', () => {
    expect(sessionReducer(setFor('quiet'), { type: 'started' }, T0).effects).toEqual([
      { kind: 'start_timer', until: END },
      { kind: 'schedule_warning', at: T0 + minutes(8) },
      { kind: 'schedule_check_in', at: T0 + minutes(5) },
      { kind: 'start_live_activity', until: END },
      { kind: 'grant_start_reward', taskId: 'task-molar', tone: 'quiet' },
      { kind: 'show_line', line: 'acknowledge' },
    ]);
  });

  it('schedules no warning for a two-minute session and no check-in under ten minutes', () => {
    const kinds = (length: number) =>
      sessionReducer(setFor('full', length), { type: 'started' }, T0).effects.map((e) => e.kind);
    expect(kinds(2)).not.toContain('schedule_warning');
    expect(kinds(5)).toContain('schedule_warning');
    expect(kinds(5)).not.toContain('schedule_check_in');
  });
});

describe('while it runs', () => {
  it('parks a thought in one tap and keeps it hidden until the end', () => {
    const step = sessionReducer(started(), { type: 'thought_parked', text: ' Bin bags ' }, T0 + 60);
    const thought = { text: 'Bin bags', parkedAt: T0 + 60 };
    expect(step.effects).toEqual([
      { kind: 'save_parked_thought', thought },
      { kind: 'play_cue', cue: 'park-a-thought' },
      { kind: 'show_line', line: 'thoughtParked' },
    ]);
    expect(visibleThoughts(step.state)).toEqual([]);
    const done = sessionReducer(step.state, { type: 'double_tapped' }, T0 + minutes(4));
    expect(visibleThoughts(done.state)).toEqual([thought]);
    expect(done.effects.at(-1)).toEqual({ kind: 'show_parked_thoughts', thoughts: [thought] });
  });

  it('offers a tiny next step on "I\'m stuck", smaller on request, then carries on', () => {
    const stuck = at(started(), 'stuck_tapped', minutes(1));
    expect(stuck.state).toMatchObject({ phase: 'stuck', checkedIn: true });
    expect(stuck.effects).toEqual([{ kind: 'show_line', line: 'tinyNextStep' }]);
    const smaller = at(stuck.state as LiveSession, 'step_smaller', minutes(1));
    expect(smaller.state).toMatchObject({ phase: 'stuck', stepShrinks: 1 });
    const okay = at(smaller.state as LiveSession, 'step_accepted', minutes(2));
    expect(okay).toMatchObject({ state: { phase: 'running', endsAt: END }, effects: [] });
    // Help was already given, so the timed check-in stays away.
    expect(at(okay.state as LiveSession, 'clock', minutes(6)).state).toMatchObject({
      phase: 'running',
    });
  });

  it('checks in half-way with a tiny next step when nobody asked', () => {
    expect(at(started(), 'clock', minutes(5) - 1).effects).toEqual([]);
    const step = at(started(), 'clock', minutes(5));
    expect(step.state).toMatchObject({ phase: 'stuck', checkedIn: true });
    expect(step.effects).toEqual([
      { kind: 'show_line', line: 'checkIn' },
      { kind: 'play_cue', cue: 'nudge' },
      { kind: 'haptic', pattern: 'nudge' },
    ]);
    expect(at(started('quiet'), 'clock', minutes(5)).effects).toEqual([
      { kind: 'show_line', line: 'tinyNextStep' },
    ]);
  });

  it('warns once with two minutes left', () => {
    const step = at(started(), 'clock', minutes(8));
    expect(step.state).toMatchObject({ phase: 'running', warned: true });
    expect(step.effects).toEqual([
      { kind: 'show_line', line: 'twoMinutesLeft' },
      { kind: 'play_cue', cue: 'two-minutes-left' },
      { kind: 'haptic', pattern: 'two-minutes-left' },
    ]);
    expect(at(step.state as LiveSession, 'clock', minutes(9)).effects).toEqual([]);
    expect(at(started('quiet'), 'clock', minutes(8)).effects).toEqual([]);
  });

  it('calls time when the end timestamp passes', () => {
    const step = at(started(), 'clock', minutes(10));
    expect(step.state).toMatchObject({ phase: 'time_up', endsAt: END });
    expect(step.effects).toEqual([
      { kind: 'overtime_live_activity' },
      { kind: 'show_line', line: 'timeUp' },
      { kind: 'play_cue', cue: 'nudge' },
      { kind: 'haptic', pattern: 'nudge' },
    ]);
  });
});

describe('finishing', () => {
  const finishEffects = (method: string) => [
    { kind: 'cancel_timer' },
    { kind: 'end_live_activity', caught: true },
    {
      kind: 'record_session_end',
      outcome: 'finished',
      finishMethod: method,
      notFinishedChoice: null,
      endedAt: T0 + minutes(9),
    },
  ];

  it('bursts, rewards and hands over the treat when the hold completes', () => {
    const holding = at(started(), 'hold_started', minutes(9));
    expect(holding.state).toMatchObject({ phase: 'holding', heldFrom: 'running' });
    expect(holding.effects.slice(-2)).toEqual([
      { kind: 'play_cue', cue: 'hold-rising' },
      { kind: 'haptic', pattern: 'hold-rising' },
    ]);
    const done = at(holding.state as LiveSession, 'hold_completed', minutes(9));
    expect(done.state).toMatchObject({ phase: 'finished', endedAt: T0 + minutes(9) });
    expect(done.effects).toEqual([
      ...finishEffects('hold'),
      { kind: 'grant_finish_reward', taskId: 'task-molar', tone: 'full' },
      { kind: 'show_burst', burst: 'confetti' },
      { kind: 'play_cue', cue: 'finish' },
      { kind: 'haptic', pattern: 'finish' },
      { kind: 'show_line', line: 'caught' },
      { kind: 'hand_over_treat', treat: 'Coffee' },
    ]);
  });

  it('puts everything back when the hold is released early: no penalty', () => {
    const before = at(started(), 'clock', minutes(10)).state as LiveSession;
    const holding = at(before, 'hold_started', minutes(11)).state as LiveSession;
    const released = at(holding, 'hold_released', minutes(11));
    expect(released.state).toEqual(before);
    expect(released.effects).toEqual([
      { kind: 'stop_cue', cue: 'hold-rising' },
      { kind: 'show_line', line: 'releasedEarly' },
    ]);
  });

  it('finishes a serious task with the quiet cue and nothing else that celebrates', () => {
    const running = at(started('quiet'), 'clock', minutes(8)).state as LiveSession;
    expect(at(running, 'finish_tapped', minutes(9)).effects).toEqual([
      ...finishEffects('tap'),
      { kind: 'grant_finish_reward', taskId: 'task-molar', tone: 'quiet' },
      { kind: 'play_cue', cue: 'quiet-finish' },
      { kind: 'haptic', pattern: 'quiet-finish' },
      { kind: 'show_line', line: 'done' },
    ]);
    // The plain tap belongs to the quiet path only.
    expect(at(started(), 'finish_tapped', minutes(1)).state).toMatchObject({ phase: 'running' });
  });

  it('finishes on a catch as a hold does, and a serious task has nothing to catch', () => {
    const caught = at(started(), 'caught', minutes(1));
    expect(caught.state).toMatchObject({ phase: 'finished' });
    const held = at(started(), 'hold_started', minutes(1)).state as LiveSession;
    expect(caught.effects).toEqual(at(held, 'hold_completed', minutes(1)).effects);
    expect(at(started('quiet'), 'caught', minutes(1)).state).toMatchObject({ phase: 'running' });
  });
});

describe('not finished', () => {
  const timeUp = at(started(), 'clock', minutes(10)).state as LiveSession;
  const asked = at(timeUp, 'not_finished', minutes(11));
  const choose = (type: SessionEvent['type']) => at(asked.state as LiveSession, type, minutes(12));
  const record = (choice: string) => ({
    kind: 'record_session_end',
    outcome: 'not_finished',
    finishMethod: null,
    notFinishedChoice: choice,
    endedAt: T0 + minutes(11),
  });

  it('is a normal outcome with one line and three choices', () => {
    expect(asked.state).toMatchObject({ phase: 'not_finished' });
    // Said in overtime, where the Live Activity was still up: it ends here.
    expect(asked.effects).toEqual([
      { kind: 'cancel_timer' },
      { kind: 'end_live_activity' },
      { kind: 'show_line', line: 'notFinished' },
    ]);
  });

  it('can be said before time is up, and leads to the same choices with the work recorded', () => {
    const early = at(started(), 'not_finished', minutes(3));
    expect(early.state).toMatchObject({ phase: 'not_finished', endedAt: T0 + minutes(3) });
    expect(early.effects).toEqual([
      { kind: 'cancel_timer' },
      { kind: 'end_live_activity' },
      { kind: 'show_line', line: 'notFinished' },
    ]);
    const carried = at(early.state as LiveSession, 'chose_carry_on', minutes(4));
    expect(carried.state).toMatchObject({ phase: 'carried_over' });
    expect(carried.effects).toContainEqual({
      kind: 'record_session_end',
      outcome: 'not_finished',
      finishMethod: null,
      notFinishedChoice: 'carry_on',
      endedAt: T0 + minutes(3),
    });
  });

  it('carries the task on tomorrow', () => {
    const step = choose('chose_carry_on');
    expect(step.state).toMatchObject({ phase: 'carried_over', ask: { shrinkCount: 0 } });
    expect(step.effects).toEqual([
      record('carry_on'),
      { kind: 'carry_task_to_tomorrow', taskId: 'task-molar' },
    ]);
  });

  it('makes it smaller', () => {
    const step = choose('chose_make_smaller');
    expect(step.state).toMatchObject({
      phase: 'made_smaller',
      ask: { minutes: 10, shrinkCount: 1 },
    });
    expect(step.effects).toEqual([
      record('make_smaller'),
      { kind: 'shrink_task', taskId: 'task-molar' },
    ]);
  });

  it('lets it go, leaving a state with nothing in it', () => {
    const step = choose('chose_let_go');
    expect(step.state).toStrictEqual({ phase: 'let_go' });
    expect(step.effects).toEqual([{ kind: 'forget_task', taskId: 'task-molar' }]);
  });
});

describe('leaving, and the app going away', () => {
  it('ends an early exit without a word', () => {
    const step = at(started(), 'left', minutes(3));
    expect(step.state).toMatchObject({ phase: 'left_early', endedAt: T0 + minutes(3) });
    expect(step.effects).toEqual([
      { kind: 'cancel_timer' },
      { kind: 'end_live_activity' },
      {
        kind: 'record_session_end',
        outcome: 'left_early',
        finishMethod: null,
        notFinishedChoice: null,
        endedAt: T0 + minutes(3),
      },
    ]);
  });

  it('keeps counting to the same end time while in the background', () => {
    const [away, back] = walk(started(), each(minutes(2), 'backgrounded', 'foregrounded'));
    expect(away).toMatchObject({ state: { inForeground: false, endsAt: END }, effects: [] });
    expect(back).toMatchObject({ state: { phase: 'running', inForeground: true, endsAt: END } });
    expect(back?.effects).toEqual([]);
  });

  it('picks the session up after a kill and relaunch, with its timers and no second reward', () => {
    const [, relaunch] = walk(started(), each(minutes(2), 'killed', 'relaunched'));
    expect(relaunch?.state).toEqual({ ...started(), inForeground: true });
    expect(relaunch?.effects).toEqual([
      { kind: 'start_timer', until: END },
      { kind: 'schedule_warning', at: T0 + minutes(8) },
      { kind: 'schedule_check_in', at: T0 + minutes(5) },
    ]);
  });

  it('shows the warning line without the sound when it passed while the app was closed', () => {
    const killed = at(started(), 'killed', minutes(1)).state as LiveSession;
    const step = at(killed, 'relaunched', minutes(9));
    expect(step.state).toMatchObject({ phase: 'running', warned: true, endsAt: END });
    expect(step.effects).toEqual([
      { kind: 'start_timer', until: END },
      { kind: 'show_line', line: 'twoMinutesLeft' },
    ]);
  });

  it('opens on "time" when the session ended while the app was closed, and can still be finished', () => {
    const killed = at(started(), 'killed', minutes(1)).state as LiveSession;
    const step = at(killed, 'relaunched', minutes(90));
    expect(step.state).toMatchObject({ phase: 'time_up', endsAt: END });
    expect(step.effects).toEqual([
      { kind: 'overtime_live_activity' },
      { kind: 'show_line', line: 'timeUp' },
    ]);
    const done = endOf(step.state, each(1000, 'hold_started', 'hold_completed'));
    expect(done).toMatchObject({ phase: 'finished' });
  });

  it('drops a hold that the app going away interrupted', () => {
    const holding = at(started(), 'hold_started', minutes(3)).state as LiveSession;
    expect(at(holding, 'backgrounded', minutes(3))).toEqual({
      state: { ...started(), inForeground: false },
      effects: [{ kind: 'stop_cue', cue: 'hold-rising' }],
    });
    expect(at(holding, 'killed', minutes(3)).effects).toEqual([]);
  });
});

describe('changing your mind after "not finished"', () => {
  it('goes back to the running session when time is not up, with its timers', () => {
    const early = at(started(), 'not_finished', minutes(3)).state as LiveSession;
    const back = at(early, 'mind_changed', minutes(4));
    expect(back.state).toMatchObject({ phase: 'running', endedAt: null, endsAt: END });
    expect(back.effects).toEqual(
      expect.arrayContaining([
        { kind: 'start_timer', until: END },
        { kind: 'start_live_activity', until: END },
      ]),
    );
    // Finishing is possible from there, as if nothing had been tapped.
    expect(at(back.state as LiveSession, 'double_tapped', minutes(5)).state.phase).toBe('finished');
  });

  it('goes back to time up when the time has run out, where the hold still finishes', () => {
    const late = at(started(), 'not_finished', minutes(11)).state as LiveSession;
    const back = at(late, 'mind_changed', minutes(12));
    expect(back.state).toMatchObject({ phase: 'time_up', endedAt: null });
    expect(back.effects.some((effect) => effect.kind === 'start_timer')).toBe(false);
    expect(at(back.state as LiveSession, 'double_tapped', minutes(12)).state.phase).toBe(
      'finished',
    );
  });

  it('does nothing anywhere else', () => {
    const running = started();
    expect(at(running, 'mind_changed', minutes(1)).state).toEqual(running);
  });
});

describe('parking a thought at the very end', () => {
  const park = (state: LiveSession, offset: number) =>
    sessionReducer(state, { type: 'thought_parked', text: 'ring Mum' }, T0 + offset);

  it('is taken once time is up, so an open park field can hand its words over', () => {
    const timeUp = at(started(), 'clock', minutes(10)).state as LiveSession;
    expect(timeUp.phase).toBe('time_up');
    const step = park(timeUp, minutes(11));
    expect(step.state).toMatchObject({ phase: 'time_up', thoughts: [{ text: 'ring Mum' }] });
    // Kept without a word: no cue over the moment, and the time-up line stays.
    expect(step.effects.map((effect) => effect.kind)).toEqual(['save_parked_thought']);
  });

  it('is kept without a word while the finish is held, and still said while stuck help is up', () => {
    const holding = at(started(), 'hold_started', minutes(3)).state as LiveSession;
    expect(park(holding, minutes(3)).effects.map((effect) => effect.kind)).toEqual([
      'save_parked_thought',
    ]);
    const stuck = at(started(), 'stuck_tapped', minutes(2)).state as LiveSession;
    expect(park(stuck, minutes(3)).effects.map((effect) => effect.kind)).toEqual([
      'save_parked_thought',
      'play_cue',
      'show_line',
    ]);
  });

  it('is taken while the finish is being held, and the hold goes on', () => {
    const holding = at(started(), 'hold_started', minutes(3)).state as LiveSession;
    const step = park(holding, minutes(3));
    expect(step.state).toMatchObject({ phase: 'holding', thoughts: [{ text: 'ring Mum' }] });
    expect(at(step.state as LiveSession, 'hold_completed', minutes(3)).state.phase).toBe(
      'finished',
    );
  });

  it('is still refused once the session is over or answered "not finished"', () => {
    const over = at(started(), 'not_finished', minutes(3)).state as LiveSession;
    expect(park(over, minutes(4)).state).toEqual(over);
  });
});
