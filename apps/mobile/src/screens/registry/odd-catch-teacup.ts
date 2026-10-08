import { catchState } from '../../features/session/registry/catch-fixtures';

import type { ScreenState } from './support/screen-state';

const { undesignedReason: _undesigned, ...state } = catchState({
  id: 'odd-catch-teacup',
  kind: 'teacup',
  view: { kind: 'finish', control: 'catch', timeUp: false },
  conditions: ['long-text'],
  changes: (_language) => ({ fraction: 0.3, minutesLeft: 3 }),
});

/**
 * The ninth catch, an upturned teacup: "I'm done" has been said, the cup hangs over him and the
 * gesture is unlocked.
 */
export const oddCatchTeacup: ScreenState = {
  ...state,
  design: {
    board: 'Starting Helpers',
    section: '07 Odd week',
    screen: 'Catch · the ninth',
  },
};
