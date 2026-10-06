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
 * Stuck help, asked for or offered by the timed check-in: the tiny next step with Smaller and Okay.
 */
export const sessionStuckHelp = sessionState({
  id: 'session-stuck-help',
  design: { board: SCOOTCH_BOARD, section: '04 Session', screen: 'Stuck help' },
  model: (language) =>
    fixtureModel(language, { ...WORKING, stuck: true }, { line: packLine(language, 'checkIn') }),
});
