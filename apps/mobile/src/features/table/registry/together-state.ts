import { lazy } from 'react';

import {
  standardVariants,
  type Condition,
  type DesignReference,
  type ScreenState,
} from '../../../screens/registry/support/screen-state';
import type { TogetherCapture } from '../captures';

export const TABLES_WAYS_IN = { board: 'Tables', section: '01 Ways in' } as const;
export const TABLES_FIRST_TIME = { board: 'Tables', section: '02 First time at a table' } as const;
export const TABLES_ROOM = { board: 'Tables', section: '03 Room' } as const;
export const TABLES_AROUND = { board: 'Tables', section: '04 Around the table' } as const;
export const TABLES_MANAGING = { board: 'Tables', section: '05 Managing tables' } as const;
export const SEAT_CONTROLS = {
  board: 'Care and Edge States',
  section: '05 Strangers at tables',
} as const;
export const HAUNT_BOARD = { board: 'Growth', section: '02 Haunt a friend' } as const;

export interface TogetherStateInput {
  readonly id: string;
  readonly design: DesignReference | null;
  readonly undesignedReason?: string;
  readonly capture: TogetherCapture;
  readonly conditions?: readonly Condition[];
}

/** One state of the tables, friends, account or haunt screens, loaded only when it is shown. */
export function togetherState(input: TogetherStateInput): ScreenState {
  return {
    id: input.id,
    design: input.design,
    ...(input.undesignedReason === undefined ? {} : { undesignedReason: input.undesignedReason }),
    component: lazy(() =>
      import('../captures').then((captures) => ({
        default: captures.TOGETHER_CAPTURES[input.capture],
      })),
    ),
    variants: standardVariants(input.conditions ?? []),
  };
}
