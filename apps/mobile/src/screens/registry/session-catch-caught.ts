import { catchState } from '../../features/session/registry/catch-fixtures';
import { packLine } from '../../features/session/registry/fixtures';

/**
 * The catch has landed: the stamp is down and Scootch says his caught line.
 */
export const sessionCatchCaught = catchState({
  id: 'session-catch-caught',
  kind: 'jar',
  view: { kind: 'caught', control: 'catch' },
  changes: (language) => ({ fraction: 0, minutesLeft: 0, line: packLine(language, 'caught') }),
});
