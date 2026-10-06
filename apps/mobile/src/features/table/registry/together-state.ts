import { lazy } from 'react';

import {
  standardVariants,
  type Condition,
  type DesignReference,
  type ScreenState,
} from '../../../screens/registry/support/screen-state';
import type { TogetherCapture } from '../captures';

export const TABLES_ROOM = { board: 'Tables', section: '01 Room' } as const;
export const SEAT_CONTROLS = {
  board: 'Care and Edge States',
  section: '05 Strangers at tables',
} as const;
export const HAUNT_BOARD = { board: 'Growth', section: '02 Haunt a friend' } as const;
export const FRIEND_PASS = {
  board: 'Plus',
  section: '04 Friends, gifts, lifetime, shelf and manage',
} as const;

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
