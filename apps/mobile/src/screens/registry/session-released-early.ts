import { fixtureModel, packLine } from '../../features/session/registry/fixtures';
import { SCOOTCH_BOARD, sessionState } from '../../features/session/registry/session-state';

const FINISH_HOLD = { kind: 'finish', control: 'hold', timeUp: true } as const;

/**
 * The hold let go of early: the ring part-filled and draining, and a kind caption. Nothing is lost.
 */
export const sessionReleasedEarly = sessionState({
  id: 'session-released-early',
  design: {
    board: SCOOTCH_BOARD,
    section: '05 Hold to finish and rewards',
    screen: 'Released early',
  },
  model: (language) =>
    fixtureModel(language, FINISH_HOLD, {
      minutesLeft: 0,
      fraction: 0,
      line: packLine(language, 'timeUp'),
      holdStartsAt: 0.4,
    }),
});
