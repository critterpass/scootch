import { describe, expect, it } from '@jest/globals';

import { NUDGE_LIMIT, nudgeDue } from './pull-nudge';

describe('the pull the one screen shows by itself', () => {
  it('is shown only when something is in the drawer to be found', () => {
    expect(nudgeDue(0, 0)).toBe(false);
    expect(nudgeDue(0, 1)).toBe(true);
  });

  it('is shown three times on a phone, and never again', () => {
    expect(NUDGE_LIMIT).toBe(3);
    expect(nudgeDue(2, 4)).toBe(true);
    expect(nudgeDue(3, 4)).toBe(false);
    expect(nudgeDue(9, 4)).toBe(false);
  });
});
