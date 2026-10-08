import { catchState } from '../../features/session/registry/catch-fixtures';
import { packLine } from '../../features/session/registry/fixtures';

/**
 * Time is up with Scootch on the screen: his line under the empty ring, the hold to finish at the
 * foot, and the monster in the corner.
 */
export const sessionScootchHoldToFinish = catchState({
  id: 'session-scootch-hold-to-finish',
  kind: 'jar',
  view: { kind: 'finish', control: 'catch', timeUp: true },
  face: 'scootch',
  changes: (language) => ({ fraction: 0, minutesLeft: 0, line: packLine(language, 'timeUp') }),
});
