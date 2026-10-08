import { fixtureModel, packLine } from '../../features/session/registry/fixtures';
import { sessionState } from '../../features/session/registry/session-state';

const FINISH_HOLD = { kind: 'finish', control: 'hold', timeUp: true } as const;

/**
 * Time is up: the time-up line, the hold control, and "Not finished" beside it.
 */
export const sessionHoldToFinish = sessionState({
  id: 'session-hold-to-finish',
  design: null,
  undesignedReason:
    'The board now draws the catches where it drew the hold. The hold is still the finish wherever a monster cannot be caught by hand, so it keeps the screen the board drew for it before.',
  model: (language) =>
    fixtureModel(language, FINISH_HOLD, {
      minutesLeft: 0,
      fraction: 0,
      line: packLine(language, 'timeUp'),
    }),
});
