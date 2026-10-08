import { fixtureModel, packLine, typed } from '../../features/session/registry/fixtures';
import { SCOOTCH_BOARD, sessionState } from '../../features/session/registry/session-state';

/**
 * The treat named before starting, handed over with ceremony.
 */
export const sessionTreat = sessionState({
  id: 'session-treat',
  design: {
    board: SCOOTCH_BOARD,
    section: '05 The catch and rewards',
    screen: 'Real-world treat',
  },
  model: (language) =>
    fixtureModel(
      language,
      { kind: 'treat', treat: typed(language).treat },
      { line: packLine(language, 'caught') },
    ),
});
