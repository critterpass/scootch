import { describe, expect, it } from '@jest/globals';

import { fixtureBars, fixtureMonster, fixturePieces, fixtureTask } from './registry/keep-fixtures';
import {
  currentStep,
  earnedBy,
  revealOver,
  revealReducer,
  revealSteps,
  startReveal,
  type Earned,
  type FinishRows,
  type RevealState,
} from './reveal-steps';

const everything: Earned = { tone: 'full', card: true, piece: true, bar: true, drop: true };

function walk(state: RevealState, ...events: ('next' | 'skip' | 'back_to_today')[]): RevealState {
  return events.reduce((before, type) => revealReducer(before, { type }), state);
}

describe('the reveal', () => {
  it('shows a card, a world piece, a bar and then a drop, in that order', () => {
    expect(revealSteps(everything)).toEqual(['card', 'piece', 'bar', 'drop']);
    const state = startReveal(everything);
    expect(currentStep(state)).toBe('card');
    expect(currentStep(walk(state, 'next'))).toBe('piece');
    expect(currentStep(walk(state, 'next', 'next'))).toBe('bar');
    expect(currentStep(walk(state, 'next', 'next', 'next'))).toBe('drop');
    expect(revealOver(walk(state, 'next', 'next', 'next', 'next'))).toBe(true);
  });

  it('leaves out what the finish did not give', () => {
    // A second finish on a day adds no bar, and most finishes drop nothing.
    expect(revealSteps({ ...everything, bar: false, drop: false })).toEqual(['card', 'piece']);
    // A task finished before the server answered has no monster, so no card.
    expect(revealSteps({ ...everything, card: false, drop: false })).toEqual(['piece', 'bar']);
  });

  it('skips one step with one tap, and never past the end', () => {
    const state = startReveal(everything);
    expect(currentStep(walk(state, 'skip'))).toBe('piece');
    expect(currentStep(walk(state, 'skip', 'skip', 'skip'))).toBe('drop');
    const over = walk(state, 'skip', 'skip', 'skip', 'skip');
    expect(revealOver(over)).toBe(true);
    expect(walk(over, 'skip', 'next')).toEqual(over);
  });

  it('goes back to today from the piece, stopping only to hand over a drop', () => {
    const withDrop = walk(startReveal(everything), 'next');
    expect(currentStep(walk(withDrop, 'back_to_today'))).toBe('drop');
    const noDrop = walk(startReveal({ ...everything, drop: false }), 'next');
    expect(revealOver(walk(noDrop, 'back_to_today'))).toBe(true);
  });

  it('shows a serious finish nothing at all', () => {
    const quiet = startReveal({ ...everything, tone: 'quiet' });
    expect(quiet.steps).toEqual([]);
    expect(currentStep(quiet)).toBeNull();
    expect(revealOver(quiet)).toBe(true);
  });
});

describe('what a finish gave, read back from storage', () => {
  const monster = fixtureMonster(0);
  const rows: FinishRows = {
    task: fixtureTask(0),
    tone: 'full',
    localDate: monster.caughtOn,
    monster,
    pieces: fixturePieces(1),
    bars: fixtureBars(1),
    drops: [],
  };

  it('finds the card, the piece and the bar of today', () => {
    expect(earnedBy(rows)).toEqual({
      tone: 'full',
      card: true,
      piece: true,
      bar: true,
      drop: false,
    });
  });

  it('shows no bar for a second finish of the day, and a drop only until it is answered', () => {
    const second = fixtureMonster(7);
    const drop = {
      id: 'drop-1',
      taskId: 'fixture-task-7',
      catchNumber: 8,
      pick: 0.4,
      droppedOn: second.caughtOn,
      choice: null,
    } as const;
    const later: FinishRows = {
      ...rows,
      task: fixtureTask(7),
      monster: second,
      pieces: [...rows.pieces, { ...fixturePieces(8)[7]!, addedOn: second.caughtOn }],
      drops: [drop],
    };
    expect(earnedBy(later)).toMatchObject({ card: true, piece: true, bar: false, drop: true });
    expect(earnedBy({ ...later, drops: [{ ...drop, choice: 'later' }] }).drop).toBe(false);
  });
});
