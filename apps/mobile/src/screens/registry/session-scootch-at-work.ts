import { catchState, TRAP_SETTING } from '../../features/session/registry/catch-fixtures';
import { packLine } from '../../features/session/registry/fixtures';

/**
 * The two have changed places: Scootch works on his disc with the time and the task under him,
 * and the monster waits in the corner beside its name.
 */
export const sessionScootchAtWork = catchState({
  id: 'session-scootch-at-work',
  kind: 'jar',
  view: TRAP_SETTING,
  face: 'scootch',
  conditions: ['long-text'],
  changes: (language) => ({ line: packLine(language, 'working') }),
});
