import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import type { NextStart } from '../contracts';
import { addDays } from '../day';
import { TODAY } from '../day/test/rows';

import {
  NEXT_START_SHOWN_MS,
  keptLineLabel,
  nextStartAfter,
  nextStartFrom,
  sessionOpening,
} from './next-start';
import { sessionReducer, sessionSet } from './session-reducer';
import type { LiveSession, SessionState, SessionTone } from './session-types';
import { T0, anyEvent, each, endOf, minutes, setFor, walk } from './test/session-walk';

const YESTERDAY = addDays(TODAY, -1);
/** The user's words, with their own spacing and capitals inside. */
const line: NextStart = { text: 'open the Draft,  read the last line', writtenOn: YESTERDAY };

const setWith = (tone: SessionTone = 'full', nextStart: NextStart | null = line) =>
  sessionSet({ taskId: 'task-molar', tone, minutes: 10, treat: 'Coffee', nextStart });
const kept = (state: SessionState) => ('nextStart' in state ? state.nextStart : undefined);
const toNotFinished = each(minutes(3), 'started', 'not_finished');

describe('a line left for next time', () => {
  it('is the words as they were said, with the day they were written', () => {
    expect(nextStartFrom('  open the Draft,  read the last line \n', YESTERDAY)).toEqual(line);
    expect(nextStartFrom('x'.repeat(400), TODAY)?.text).toHaveLength(280);
  });

  it('is nothing when nothing was said', () => {
    expect(nextStartFrom('', TODAY)).toBeNull();
    expect(nextStartFrom('  \n ', TODAY)).toBeNull();
  });

  it('is kept when the task is carried to tomorrow', () => {
    const carried = endOf(setWith(), [...toNotFinished, ...each(1000, 'chose_carry_on')]);
    expect(carried).toMatchObject({ phase: 'carried_over', nextStart: line });
    expect(nextStartAfter(line, 'carried_over')).toEqual(line);
    expect(nextStartAfter(null, 'carried_over')).toBeNull();
    expect(nextStartAfter(undefined, 'carried_over')).toBeNull();
  });

  it('is cleared when the task is made smaller, before the start or after it', () => {
    const smaller = endOf(setWith(), [...toNotFinished, ...each(1000, 'chose_make_smaller')]);
    expect(smaller.phase).toBe('made_smaller');
    expect(kept(smaller)).toBeUndefined();

    const tooBig = sessionReducer(setWith(), { type: 'too_big' }, T0).state;
    expect(tooBig.phase).toBe('set');
    expect(kept(tooBig)).toBeUndefined();
    expect(sessionOpening(tooBig, T0, TODAY)).toBeNull();
    expect(nextStartAfter(line, 'made_smaller')).toBeNull();
  });

  it('is cleared at the catch, whichever way the thing was finished', () => {
    for (const finish of ['caught', 'double_tapped', 'said_done'] as const) {
      const finished = endOf(setWith(), each(minutes(3), 'started', finish));
      expect(finished.phase).toBe('finished');
      expect(kept(finished)).toBeUndefined();
    }
    const plain = endOf(setWith('quiet'), each(minutes(3), 'started', 'finish_tapped'));
    expect(plain.phase).toBe('finished');
    expect(kept(plain)).toBeUndefined();
    expect(nextStartAfter(line, 'caught')).toBeNull();
  });

  it('is gone with everything else when the task is let go', () => {
    const letGo = endOf(setWith(), [...toNotFinished, ...each(1000, 'chose_let_go')]);
    expect(letGo).toStrictEqual({ phase: 'let_go' });
    expect(nextStartAfter(line, 'let_go')).toBeNull();
  });

  it('stays through everything else a sitting does', () => {
    const moves = each(minutes(1), 'started', 'stuck_tapped', 'step_accepted', 'killed');
    const state = endOf(setWith(), [...moves, ...each(minutes(1), 'relaunched', 'left')]);
    expect(state).toMatchObject({ phase: 'left_early', nextStart: line });
  });

  it('changes nothing else: a session does the same things with a line as without', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ event: anyEvent, wait: fc.integer({ min: 0, max: minutes(4) }) }), {
          maxLength: 12,
        }),
        fc.constantFrom<SessionTone>('full', 'quiet'),
        (moves, tone) => {
          const withLine = walk(setWith(tone), moves);
          const without = walk(setWith(tone, null), moves);
          expect(withLine.map((visit) => visit.effects)).toStrictEqual(
            without.map((visit) => visit.effects),
          );
          const bare = (state: SessionState) => {
            const { nextStart: _line, ...rest } = state as LiveSession;
            return rest;
          };
          expect(withLine.map((visit) => bare(visit.state))).toStrictEqual(
            without.map((visit) => bare(visit.state)),
          );
        },
      ),
    );
  });

  it('leaves a session with no line exactly as it was', () => {
    expect(setWith('full', null)).toStrictEqual(setFor());
    expect(setWith('full', null)).not.toHaveProperty('nextStart');
  });
});

describe('the sitting that opens on it', () => {
  const running = (tone: SessionTone = 'full') =>
    sessionReducer(setWith(tone), { type: 'started' }, T0).state;

  it('shows the words exactly as they were left, before the start and for the first minute', () => {
    const opening = { text: line.text, label: 'yesterday', plain: false };
    expect(sessionOpening(setWith(), T0, TODAY)).toEqual(opening);
    expect(sessionOpening(running(), T0, TODAY)).toEqual(opening);
    expect(sessionOpening(running(), T0 + NEXT_START_SHOWN_MS - 1, TODAY)).toEqual(opening);
  });

  it('folds away after the first minute, and is not there once the sitting is over', () => {
    expect(sessionOpening(running(), T0 + NEXT_START_SHOWN_MS, TODAY)).toBeNull();
    expect(sessionOpening(running(), T0 + minutes(5), TODAY)).toBeNull();
    const carried = endOf(setWith(), [...toNotFinished, ...each(1000, 'chose_carry_on')]);
    expect(sessionOpening(carried, T0, TODAY)).toBeNull();
    expect(sessionOpening({ phase: 'let_go' }, T0, TODAY)).toBeNull();
  });

  it('is nothing when no line was left', () => {
    expect(sessionOpening(setFor(), T0, TODAY)).toBeNull();
  });

  it('keeps the line on a serious task and shows it plain', () => {
    const serious = running('quiet');
    expect(serious).toMatchObject({ tone: 'quiet', nextStart: line });
    expect(sessionOpening(serious, T0, TODAY)).toEqual({
      text: line.text,
      label: 'yesterday',
      plain: true,
    });
    // Its start is the quiet one it always was: no burst, no sound, no joke.
    const started = sessionReducer(setWith('quiet'), { type: 'started' }, T0);
    expect(started.effects).toStrictEqual(
      sessionReducer(setFor('quiet'), { type: 'started' }, T0).effects,
    );
  });
});

describe('the label over a kept line', () => {
  it.each([
    ['the day before', -1, 'yesterday'],
    ['the same day', 0, null],
    ['two days before', -2, null],
    ['a week before', -7, null],
    ['a month before', -30, null],
    ['a day the clock has not reached', 1, null],
  ])('written %s: %s', (_name, offset, label) => {
    expect(keptLineLabel({ writtenOn: addDays(TODAY, offset) }, TODAY)).toBe(label);
  });

  it('is "yesterday" or nothing: no other day is ever named or counted', () => {
    fc.assert(
      fc.property(fc.integer({ min: -800, max: 800 }), (offset) => {
        const label = keptLineLabel({ writtenOn: addDays(TODAY, offset) }, TODAY);
        expect(label).toBe(offset === -1 ? 'yesterday' : null);
      }),
    );
  });

  it('reads the calendar, across a month and a year', () => {
    expect(keptLineLabel({ writtenOn: '2026-12-31' }, '2027-01-01')).toBe('yesterday');
    expect(keptLineLabel({ writtenOn: '2028-02-29' }, '2028-03-01')).toBe('yesterday');
    expect(keptLineLabel({ writtenOn: '2026-02-28' }, '2026-03-02')).toBeNull();
  });
});
