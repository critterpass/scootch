import { fixtureModel, packLine } from '../../features/session/registry/fixtures';
import { SCOOTCH_BOARD, sessionState } from '../../features/session/registry/session-state';

/**
 * Not finished: starting was the hard bit, and three calm ways on.
 */
export const sessionNotFinished = sessionState({
  id: 'session-not-finished',
  design: {
    board: SCOOTCH_BOARD,
    section: '06 Not finished and coming back',
    screen: 'Not finished',
  },
  model: (language) =>
    fixtureModel(language, { kind: 'not_finished' }, { line: packLine(language, 'notFinished') }),
});
