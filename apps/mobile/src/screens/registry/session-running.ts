import { fixtureModel, packLine } from '../../features/session/registry/fixtures';
import { SCOOTCH_BOARD, sessionState } from '../../features/session/registry/session-state';

const WORKING = {
  kind: 'working',
  quiet: false,
  stuck: false,
  twoMinutesLeft: false,
  timeUp: false,
} as const;

/**
 * The session at work: the shrinking disc, the minutes left, the task and one of the working lines.
 */
export const sessionRunning = sessionState({
  id: 'session-running',
  design: { board: SCOOTCH_BOARD, section: '04 Session', screen: 'Running' },
  conditions: ['long-text'],
  model: (language) => fixtureModel(language, WORKING, { line: packLine(language, 'working') }),
});
