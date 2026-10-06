import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { sessionReducer, visibleThoughts } from './session-reducer';
import type { SessionEffect, SessionEvent, SessionLine, SessionState } from './session-types';
import {
  anyEvent,
  anyLength,
  anyMoves,
  anyTone,
  each,
  lifecycleMoves,
  minutes,
  setFor,
  walk,
  type Move,
  type Visit,
} from './test/session-walk';

const started: Move = { event: { type: 'started' }, wait: 0 };

/** Every line slot a session may show. None is about days away, and nothing else may be shown. */
const lineSlots: readonly SessionLine[] = [
  'start',
  'acknowledge',
  'checkIn',
  'tinyNextStep',
  'twoMinutesLeft',
  'timeUp',
  'caught',
  'done',
  'notFinished',
  'thoughtParked',
  'releasedEarly',
];
const aboutTimeAway = /miss|gap|streak|absen|away|behind|lazy|fail|finally|again|welcome|return/i;

/** Effects a person would notice. */
const felt = (effect: SessionEffect) =>
  ['show_line', 'play_cue', 'haptic', 'show_burst'].includes(effect.kind);

const canFinish = (state: SessionState) =>
  state.phase === 'running' || state.phase === 'stuck' || state.phase === 'time_up';

/** The last state of a walk, brought up to its own time, when a finish gesture is possible there. */
function finishable(visits: readonly Visit[]): { state: SessionState; now: number } | null {
  const last = visits.at(-1);
  if (!last) return null;
  const state = sessionReducer(last.state, { type: 'clock' }, last.now).state;
  return canFinish(state) ? { state, now: last.now } : null;
}

describe('session invariants', { timeout: 60_000 }, () => {
  it('never lets the ask grow: minutes only fall and shrinks only add up', () => {
    fc.assert(
      fc.property(anyTone, anyLength, anyMoves, (tone, length, moves) => {
        for (const visit of walk(setFor(tone, length), moves)) {
          if (visit.before.phase === 'let_go' || visit.state.phase === 'let_go') continue;
          expect(visit.state.ask.minutes).toBeLessThanOrEqual(visit.before.ask.minutes);
          expect(visit.state.ask.minutes).toBeGreaterThanOrEqual(1);
          expect(visit.state.ask.shrinkCount).toBeGreaterThanOrEqual(visit.before.ask.shrinkCount);
          expect(visit.state.stepShrinks).toBeGreaterThanOrEqual(visit.before.stepShrinks);
        }
      }),
    );
  });

  it('never runs longer than the ask at the moment of starting', () => {
    fc.assert(
      fc.property(anyTone, anyLength, anyMoves, (tone, length, moves) => {
        for (const { state } of walk(setFor(tone, length), moves)) {
          if (state.phase === 'let_go' || state.startedAt === null || state.endsAt === null)
            continue;
          expect(state.endsAt - state.startedAt).toBe(minutes(state.ask.minutes));
          expect(state.ask.minutes).toBeLessThanOrEqual(length);
        }
      }),
    );
  });

  it('never says anything about missed days or time away, in any reachable state', () => {
    fc.assert(
      fc.property(anyTone, anyLength, anyMoves, (tone, length, moves) => {
        for (const { state, effects } of walk(setFor(tone, length), moves)) {
          for (const effect of effects) {
            if (effect.kind === 'show_line') expect(lineSlots).toContain(effect.line);
          }
          expect(JSON.stringify(effects)).not.toMatch(aboutTimeAway);
          expect(Object.keys(state).join(' ')).not.toMatch(aboutTimeAway);
        }
      }),
    );
  });

  it('reaches the same finished state with the same reward by hold, double tap or voice', () => {
    fc.assert(
      fc.property(anyTone, anyLength, anyMoves, (tone, length, moves) => {
        const last = finishable(walk(setFor(tone, length), [started, ...moves]));
        if (!last) return;
        const finishBy = (...types: SessionEvent['type'][]) => {
          const end = walk(last.state, each(0, ...types), last.now).at(-1);
          if (!end) throw new Error('no step was taken');
          return end;
        };
        const ways = [
          finishBy('hold_started', 'hold_completed'),
          finishBy('double_tapped'),
          finishBy('said_done'),
          ...(tone === 'quiet' ? [finishBy('finish_tapped')] : []),
        ];
        const reward = (effects: readonly SessionEffect[]) =>
          effects.filter((effect) => effect.kind !== 'record_session_end');
        for (const way of ways) {
          expect(way.state).toMatchObject({ phase: 'finished', endedAt: last.now });
          expect(way.state).toStrictEqual(ways[0]?.state);
          expect(reward(way.effects)).toStrictEqual(reward(ways[0]?.effects ?? []));
          expect(way.effects).toContainEqual({
            kind: 'grant_finish_reward',
            taskId: 'task-molar',
            tone,
          });
        }
        const methods = ways.flatMap((way) =>
          way.effects.flatMap((e) => (e.kind === 'record_session_end' ? [e.finishMethod] : [])),
        );
        expect(methods).toEqual([
          'hold',
          'double_tap',
          'voice',
          ...(tone === 'quiet' ? ['tap'] : []),
        ]);
      }),
    );
  });

  it('keeps the same end time through any backgrounding, kills, relaunches and timers', () => {
    fc.assert(
      fc.property(anyTone, anyLength, lifecycleMoves, (tone, length, moves) => {
        const [start, ...rest] = walk(setFor(tone, length), [started, ...moves]);
        if (!start || start.state.phase === 'let_go') throw new Error('the session did not start');
        const { endsAt } = start.state;
        for (const visit of rest) {
          expect(visit.state).toMatchObject({ endsAt, startedAt: start.state.startedAt });
          const comesBack = ['clock', 'foregrounded', 'relaunched'].includes(visit.event.type);
          if (visit.now < (endsAt ?? 0)) expect(['running', 'stuck']).toContain(visit.state.phase);
          else if (comesBack) expect(visit.state.phase).toBe('time_up');
          // Coming back never rewards the start twice and never plays a sound late.
          expect(visit.effects.map((e) => e.kind)).not.toContain('grant_start_reward');
          if (visit.event.type !== 'clock') {
            expect(
              visit.effects.filter((e) => e.kind === 'play_cue' || e.kind === 'haptic'),
            ).toEqual([]);
          }
        }
      }),
    );
  });

  it('never moves the end time once started, whatever happens', () => {
    fc.assert(
      fc.property(anyTone, anyLength, anyMoves, (tone, length, moves) => {
        for (const { before, state } of walk(setFor(tone, length), moves)) {
          if (before.phase === 'let_go' || state.phase === 'let_go') continue;
          if (before.endsAt !== null) expect(state.endsAt).toBe(before.endsAt);
        }
      }),
    );
  });

  it('gives the same state after a relaunch as the app that never closed, sounds aside', () => {
    fc.assert(
      fc.property(anyLength, fc.integer({ min: 0, max: minutes(60) }), (length, later) => {
        const [start] = walk(setFor('full', length), [started]);
        if (!start) throw new Error('the session did not start');
        const stayed = sessionReducer(start.state, { type: 'clock' }, start.now + later).state;
        const closed = walk(start.state, [
          { event: { type: 'killed' }, wait: 0 },
          { event: { type: 'relaunched' }, wait: later },
        ]).at(-1)?.state;
        expect(closed).toStrictEqual(stayed);
      }),
    );
  });

  it('leaves nothing behind when a task is let go', () => {
    fc.assert(
      fc.property(anyTone, anyLength, anyMoves, anyMoves, (tone, length, moves, after) => {
        const visits = walk(setFor(tone, length), moves);
        const letGo = visits.find((visit) => visit.state.phase === 'let_go');
        if (!letGo) return;
        expect(letGo.state).toStrictEqual({ phase: 'let_go' });
        expect(letGo.effects.filter(felt)).toEqual([]);
        const kinds = letGo.effects.map((effect) => effect.kind);
        expect(kinds).toContain('forget_task');
        expect(
          kinds.filter((kind) => kind !== 'forget_task' && kind !== 'show_parked_thoughts'),
        ).toEqual([]);
        expect(visibleThoughts(letGo.state)).toEqual([]);
        for (const visit of walk(letGo.state, after)) {
          expect(visit).toMatchObject({ state: { phase: 'let_go' }, effects: [] });
        }
      }),
      // Letting go needs time up, "not finished" and the choice in a row: steer some runs there.
      {
        examples: [
          [
            'full',
            10,
            [
              started,
              { event: { type: 'thought_parked', text: 'Bin bags' }, wait: 5 },
              ...each(minutes(11), 'clock', 'not_finished', 'chose_let_go'),
            ],
            each(minutes(1), 'started', 'double_tapped', 'relaunched', 'clock'),
          ],
          ['quiet', 2, [started, ...each(minutes(3), 'not_finished', 'chose_let_go')], []],
        ],
      },
    );
  });

  it('says and plays nothing when the user leaves early', () => {
    fc.assert(
      fc.property(anyTone, anyLength, anyMoves, (tone, length, moves) => {
        for (const visit of walk(setFor(tone, length), [started, ...moves])) {
          if (visit.event.type !== 'left' || visit.state.phase !== 'left_early') continue;
          // Anything felt on this step belongs to the timer catching up, never to the leaving.
          const caughtUp = sessionReducer(visit.before, { type: 'clock' }, visit.now);
          expect(visit.effects.filter(felt)).toStrictEqual(caughtUp.effects.filter(felt));
          expect(visit.effects.map((effect) => effect.kind)).not.toContain('grant_finish_reward');
        }
      }),
    );
  });

  it('keeps a serious task quiet: no burst, no confetti, no loud cue, no comedy line', () => {
    const loud = ['start-burst', 'finish', 'hold-rising', 'shrink', 'nudge', 'two-minutes-left'];
    const comedy: SessionLine[] = [
      'start',
      'checkIn',
      'twoMinutesLeft',
      'timeUp',
      'caught',
      'releasedEarly',
    ];
    fc.assert(
      fc.property(anyLength, anyMoves, (length, moves) => {
        for (const { effects } of walk(setFor('quiet', length), [started, ...moves])) {
          for (const effect of effects) {
            expect(effect.kind).not.toBe('show_burst');
            expect(effect.kind).not.toBe('hand_over_treat');
            if (effect.kind === 'play_cue') expect(loud).not.toContain(effect.cue);
            if (effect.kind === 'haptic') expect(effect.pattern).toBe('quiet-finish');
            if (effect.kind === 'show_line') expect(comedy).not.toContain(effect.line);
            if ('tone' in effect) expect(effect.tone).toBe('quiet');
          }
        }
      }),
    );
  });

  it('gives back the state it had when a hold is released early', () => {
    fc.assert(
      fc.property(anyTone, anyLength, anyMoves, (tone, length, moves) => {
        const last = finishable(walk(setFor(tone, length), [started, ...moves]));
        if (!last) return;
        const end = walk(last.state, each(0, 'hold_started', 'hold_released'), last.now).at(-1);
        expect(end?.state).toStrictEqual(last.state);
        expect(end?.effects.map((e) => e.kind)).not.toContain('record_session_end');
      }),
    );
  });

  it('hides parked thoughts until the session is over, and never changes an ended session', () => {
    const over = ['finished', 'left_early', 'carried_over', 'made_smaller', 'let_go'];
    fc.assert(
      fc.property(anyTone, anyLength, anyMoves, anyEvent, (tone, length, moves, extra) => {
        for (const visit of walk(setFor(tone, length), [started, ...moves])) {
          if (!over.includes(visit.state.phase)) expect(visibleThoughts(visit.state)).toEqual([]);
          if (over.includes(visit.before.phase)) {
            expect(visit).toMatchObject({ state: visit.before, effects: [] });
            expect(sessionReducer(visit.before, extra, visit.now).effects).toEqual([]);
          }
        }
      }),
    );
  });

  it('starts each session once: one timer, one reward', () => {
    fc.assert(
      fc.property(anyTone, anyLength, anyMoves, (tone, length, moves) => {
        const kinds = walk(setFor(tone, length), moves).flatMap((visit) =>
          visit.effects.map((effect) => effect.kind),
        );
        expect(kinds.filter((kind) => kind === 'grant_start_reward').length).toBeLessThanOrEqual(1);
        expect(kinds.filter((kind) => kind === 'grant_finish_reward').length).toBeLessThanOrEqual(
          1,
        );
        expect(kinds.filter((kind) => kind === 'start_live_activity').length).toBeLessThanOrEqual(
          1,
        );
      }),
    );
  });
});
