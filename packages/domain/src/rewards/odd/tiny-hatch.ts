import type { OddHatch } from '../odd-variation';

/** The task hatches as three tiny monsters instead of one. */
export const tinyHatch = { on: 'hatch', word: 'tiny' } as const satisfies OddHatch;
