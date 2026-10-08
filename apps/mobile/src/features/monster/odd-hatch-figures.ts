import type { ComponentType } from 'react';
import type { MonsterRow, OddWord } from '@scootch/domain';

import type { MonsterProps } from '../../art/Monster';

import { TinyHatch } from './odd/tiny';

/** What an odd hatch draws in the one monster's place: the same box, the same life. */
export interface OddHatchProps extends Pick<
  MonsterProps,
  | 'sizeFactor'
  | 'mood'
  | 'squashOnChange'
  | 'hatching'
  | 'reducedMotion'
  | 'care'
  | 'onPress'
  | 'testID'
> {
  readonly monster: MonsterRow;
  readonly size: number;
}

/** The drawing for each word an odd hatch can leave on a monster. Each is one file in `odd/`. */
export const ODD_HATCH_FIGURES: Readonly<Record<OddWord, ComponentType<OddHatchProps>>> = {
  tiny: TinyHatch,
};
