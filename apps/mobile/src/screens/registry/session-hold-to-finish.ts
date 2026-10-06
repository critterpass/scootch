import { fixtureModel, packLine } from '../../features/session/registry/fixtures';
import { SCOOTCH_BOARD, sessionState } from '../../features/session/registry/session-state';

const FINISH_HOLD = { kind: 'finish', control: 'hold', timeUp: true } as const;

/**
 * Time is up: the time-up line, the hold control, and "Not finished" beside it.
 */
export const sessionHoldToFinish = sessionState({
  id: 'session-hold-to-finish',
  design: {
    board: SCOOTCH_BOARD,
    section: '05 Hold to finish and rewards',
    screen: 'Hold to finish · live',
  },
  model: (language) =>
    fixtureModel(language, FINISH_HOLD, {
      minutesLeft: 0,
      fraction: 0,
      line: packLine(language, 'timeUp'),
    }),
});
