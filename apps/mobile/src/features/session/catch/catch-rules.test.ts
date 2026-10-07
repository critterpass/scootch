import { describe, expect, it } from '@jest/globals';

import { catchStage, clockLeft, gestureUnlocked, trapProgress } from './catch-flow';
import { CATCH_KINDS, catchFor, DRAWN_IN } from './catch-kinds';
import {
  REEL_NEEDS,
  insideLoop,
  loopDrawn,
  swipeMade,
  turnsWound,
  wound,
  type TimedPoint,
} from './catch-rules';
import { fitBoard } from './fit-board';
import type { Point } from './math';
import { taskPhrase } from './task-phrase';

const FINISH = { kind: 'finish', control: 'catch' } as const;

describe('the stage of a catch', () => {
  it('cannot be caught while the work goes on, or before the person says it is done', () => {
    const working = {
      kind: 'working',
      quiet: false,
      stuck: false,
      twoMinutesLeft: false,
      timeUp: false,
      trap: true,
    } as const;
    expect(catchStage(working, 'none')).toBe('setting');
    // An answer left over from an earlier time up unlocks nothing while the timer runs.
    expect(catchStage(working, 'yes')).toBe('setting');
    expect(catchStage({ ...FINISH, timeUp: true }, 'none')).toBe('asking');
    expect(catchStage({ ...FINISH, timeUp: true }, 'not_yet')).toBe('waiting');
    for (const stage of ['coach', 'setting', 'asking', 'waiting', 'caught'] as const) {
      expect(gestureUnlocked(stage)).toBe(false);
    }
  });

  it('unlocks on a yes, and on "I\'m done" said before time is up', () => {
    expect(catchStage({ ...FINISH, timeUp: true }, 'yes')).toBe('ready');
    expect(catchStage({ ...FINISH, timeUp: false }, 'none')).toBe('ready');
    expect(gestureUnlocked('ready')).toBe(true);
    expect(catchStage({ kind: 'caught', control: 'catch' }, 'yes')).toBe('caught');
  });

  it('sets the trap with the time gone, and whole once the gesture is unlocked', () => {
    expect(trapProgress('setting', 1)).toBe(0);
    expect(trapProgress('setting', 0.25)).toBeCloseTo(0.75);
    expect(trapProgress('asking', 0)).toBe(1);
    expect(trapProgress('ready', 0.6)).toBe(1);
    expect(trapProgress('coach', 0.2)).toBe(0);
    expect(clockLeft(1, 10)).toBe('10:00');
    expect(clockLeft(0.7, 10)).toBe('7:00');
    expect(clockLeft(0.0075, 10)).toBe('0:05');
    expect(clockLeft(0, 25)).toBe('0:00');
  });
});

describe('the catch a task rolls', () => {
  it('is the same every time the task is opened, and always one of the eight', () => {
    for (const id of ['task-molar', 'a', '', '01HZX3-taxes']) {
      expect(catchFor(id)).toBe(catchFor(id));
      expect(CATCH_KINDS).toContain(catchFor(id));
    }
  });

  it('spreads tasks over all eight', () => {
    const rolled = new Set(Array.from({ length: 200 }, (_, i) => catchFor(`task-${i}`)));
    expect(rolled.size).toBe(CATCH_KINDS.length);
  });
});

describe('a task inside a sentence', () => {
  it.each([
    ['Email the dentist', 'email the dentist'],
    ['Email the dentist.', 'email the dentist'],
    ['  Do my taxes!  ', 'do my taxes'],
    ["I'll call mum", "I'll call mum"],
    ['I need a haircut', 'I need a haircut'],
    ['NHS form', 'NHS form'],
    ['Gửi email cho nha sĩ', 'gửi email cho nha sĩ'],
    ['', ''],
  ])('%j reads %j', (task, phrase) => {
    expect(taskPhrase(task)).toBe(phrase);
  });
});

const circle = (cx: number, cy: number, r: number, share = 1): Point[] =>
  Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * Math.PI * 2 * share;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as const;
  });

describe('the lasso', () => {
  const monster: Point = [196, 498];

  it('catches only with a closed loop round the monster', () => {
    expect(loopDrawn(circle(196, 498, 90), monster)).toBe('around');
    expect(loopDrawn(circle(60, 300, 50), monster)).toBe('beside');
    expect(loopDrawn(circle(196, 498, 90, 0.5), monster)).toBe('open');
    expect(loopDrawn(circle(196, 498, 90).slice(0, 4), monster)).toBe('nothing');
    expect(insideLoop([0, 0], circle(196, 498, 90))).toBe(false);
  });
});

describe('the net', () => {
  const monster: Point = [196, 498];
  const swipe = (fromX: number, toX: number, y: number, ms: number): TimedPoint[] =>
    Array.from({ length: 10 }, (_, i) => [fromX + ((toX - fromX) * i) / 9, y, (ms * i) / 9]);

  it('swoops on one quick swipe across the monster, either way', () => {
    expect(swipeMade(swipe(60, 330, 500, 200), monster)).toEqual({
      quick: true,
      across: true,
      direction: 1,
    });
    expect(swipeMade(swipe(330, 60, 500, 200), monster)?.direction).toBe(-1);
  });

  it('does not on a slow one, a short one, or one that misses', () => {
    expect(swipeMade(swipe(60, 330, 500, 2000), monster)).toMatchObject({ quick: false });
    expect(swipeMade(swipe(180, 220, 500, 40), monster)).toMatchObject({ quick: false });
    expect(swipeMade(swipe(60, 330, 120, 200), monster)).toMatchObject({ across: false });
    expect(swipeMade([[1, 1, 0]], monster)).toBeNull();
  });
});

describe('the reel', () => {
  it('counts winding forwards, across the join of a turn, and never winding back', () => {
    expect(wound(0, 0.5)).toBeCloseTo(0.5);
    expect(wound(Math.PI - 0.1, -Math.PI + 0.1)).toBeCloseTo(0.2);
    expect(wound(0.5, 0)).toBe(0);
  });

  it('takes three full turns', () => {
    expect(turnsWound(0)).toBe(0);
    expect(turnsWound(REEL_NEEDS / 3 + 0.1)).toBe(1);
    expect(turnsWound(REEL_NEEDS * 2)).toBe(3);
  });
});

describe('the board on a phone', () => {
  // Under the top row, and above the foot; the words take their share at the top or the bottom.
  const room = (height: number, inset: number, words: 'top' | 'bottom') => ({
    top: inset + 44 + (words === 'top' ? 76 : 0),
    bottom: height - 34 - (words === 'bottom' ? 86 : 0),
  });

  it("is drawn at the board's own size and place on the board's own phone", () => {
    const fit = fitBoard({ width: 393, height: 852 }, DRAWN_IN.jar, room(852, 59, 'bottom'));
    expect(fit).toEqual({ scale: 1, left: 0, top: 0 });
  });

  it('keeps every catch whole and inside its room on a short phone, close to full width', () => {
    const screen = { width: 375, height: 667 };
    for (const kind of CATCH_KINDS) {
      const words = kind === 'reel' || kind === 'sticker' || kind === 'vacuum' ? 'top' : 'bottom';
      const space = room(667, 20, words);
      const fit = fitBoard(screen, DRAWN_IN[kind], space);
      expect(fit.top + DRAWN_IN[kind].top * fit.scale).toBeGreaterThanOrEqual(space.top - 0.001);
      expect(fit.top + DRAWN_IN[kind].bottom * fit.scale).toBeLessThanOrEqual(space.bottom + 0.001);
      // Scaling the whole board to this phone's height would draw it at 78%.
      expect(fit.scale).toBeGreaterThan(0.78);
      expect(fit.scale).toBeLessThanOrEqual(375 / 393);
    }
  });

  it('is centred across a phone wider than the drawing needs', () => {
    const fit = fitBoard({ width: 430, height: 600 }, DRAWN_IN.sticker, { top: 180, bottom: 580 });
    expect(fit.left).toBeCloseTo((430 - 393 * fit.scale) / 2);
    expect(fit.scale).toBeCloseTo(400 / 624);
  });
});
