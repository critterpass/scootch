import { describe, expect, it } from '@jest/globals';

import { feelFor, type MotionFacts } from './may-move';

const ordinary: MotionFacts = {
  systemReducedMotion: false,
  motion: 'full',
  captured: false,
  care: 'none',
};

describe('whether anything may move', () => {
  it('moves on an ordinary day with nothing switched off', () => {
    expect(feelFor(ordinary)).toEqual({
      mayMove: true,
      character: { reducedMotion: false, care: 'none' },
    });
  });

  it('holds everything still under the system Reduce Motion, whatever the app switch says', () => {
    const feel = feelFor({ ...ordinary, systemReducedMotion: true, motion: 'full' });
    expect(feel.mayMove).toBe(false);
    expect(feel.character.reducedMotion).toBe(true);
  });

  it('holds everything still when the Motion switch is set to calm', () => {
    const feel = feelFor({ ...ordinary, motion: 'calm' });
    expect(feel.mayMove).toBe(false);
    expect(feel.character.reducedMotion).toBe(true);
  });

  it('is still under a capture, which must look the same every time', () => {
    expect(feelFor({ ...ordinary, captured: true }).mayMove).toBe(false);
  });

  it('gives a serious task no theatre, and leaves the character to breathe by its care', () => {
    const feel = feelFor({ ...ordinary, care: 'serious' });
    expect(feel.mayMove).toBe(false);
    // The character is not told to be still: its own care rule lets it breathe and no more.
    expect(feel.character).toEqual({ reducedMotion: false, care: 'serious' });
  });

  it('moves nothing on a crisis day', () => {
    const feel = feelFor({ ...ordinary, care: 'crisis' });
    expect(feel.mayMove).toBe(false);
    expect(feel.character.care).toBe('crisis');
  });
});
