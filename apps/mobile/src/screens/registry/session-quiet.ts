import { fixtureModel, plainLine } from '../../features/session/registry/fixtures';
import { CARE_BOARD, sessionState } from '../../features/session/registry/session-state';

const WORKING = {
  kind: 'working',
  quiet: false,
  stuck: false,
  twoMinutesLeft: false,
  timeUp: false,
  trap: false,
} as const;

/**
 * A serious task's session: an ink-grey disc, plain company, a plain tap to finish and Stop beside it.
 */
export const sessionQuiet = sessionState({
  id: 'session-quiet',
  design: {
    board: CARE_BOARD,
    section: '01 Serious mode and crisis',
    screen: 'Serious mode · quiet session',
  },
  model: (language) =>
    fixtureModel(
      language,
      { ...WORKING, quiet: true },
      {
        quiet: true,
        monster: null,
        minutesLeft: 8,
        fraction: 0.8,
        line: plainLine(language, 'working'),
      },
    ),
});
