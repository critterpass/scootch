import { describe, expect, it } from '@jest/globals';

import { boardOpensOnRelease, timetableOpensOnRelease } from './pull-release';

describe('letting go of the pull down on the desk', () => {
  it('opens the board past the 90 point mark, and springs back short of it', () => {
    expect(boardOpensOnRelease(90, 0)).toBe(true);
    expect(boardOpensOnRelease(200, 100)).toBe(true);
    expect(boardOpensOnRelease(89, 0)).toBe(false);
    expect(boardOpensOnRelease(12, 300)).toBe(false);
  });

  it('opens on a flick down from anywhere', () => {
    expect(boardOpensOnRelease(14, 600)).toBe(true);
    expect(boardOpensOnRelease(0, 1400)).toBe(true);
  });

  it('keeps the board shut on a flick back up, however far it was pulled', () => {
    expect(boardOpensOnRelease(180, -600)).toBe(false);
    expect(boardOpensOnRelease(180, -599)).toBe(true);
  });
});

describe('letting go of the swipe up on the desk sheet', () => {
  it('opens the timetable past a quarter of the way, and settles back short of it', () => {
    expect(timetableOpensOnRelease(0.25, 0)).toBe(true);
    expect(timetableOpensOnRelease(0.24, 0)).toBe(false);
  });

  it('opens on a flick up, and stays shut on a flick down', () => {
    expect(timetableOpensOnRelease(0.05, 600)).toBe(true);
    expect(timetableOpensOnRelease(0.6, -600)).toBe(false);
  });
});
