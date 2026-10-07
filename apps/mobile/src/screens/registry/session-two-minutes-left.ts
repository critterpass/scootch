import { fixtureModel, packLine } from '../../features/session/registry/fixtures';
import { SCOOTCH_BOARD, sessionState } from '../../features/session/registry/session-state';

const WORKING = {
  kind: 'working',
  quiet: false,
  stuck: false,
  twoMinutesLeft: false,
  timeUp: false,
  trap: false,
} as const;

/**
 * Two minutes left: the gentle warning, with the disc nearly gone.
 */
export const sessionTwoMinutesLeft = sessionState({
  id: 'session-two-minutes-left',
  design: { board: SCOOTCH_BOARD, section: '04 Session', screen: 'Two minutes left' },
  model: (language) =>
    fixtureModel(
      language,
      { ...WORKING, twoMinutesLeft: true },
      { minutesLeft: 2, fraction: 0.2, line: packLine(language, 'twoMinutesLeft') },
    ),
});
