import { fixtureModel, typed } from '../../features/session/registry/fixtures';
import { SCOOTCH_BOARD, sessionState } from '../../features/session/registry/session-state';

const WORKING = {
  kind: 'working',
  quiet: false,
  stuck: false,
  twoMinutesLeft: false,
  timeUp: false,
} as const;

/**
 * A thought has just been parked: a brief "Parked" and back to work.
 */
export const sessionThoughtParked = sessionState({
  id: 'session-thought-parked',
  design: { board: SCOOTCH_BOARD, section: '04 Session', screen: 'Thought parked' },
  model: (language) =>
    fixtureModel(language, WORKING, {
      minutesLeft: 6,
      fraction: 0.6,
      parkedNote: typed(language).thoughts[0],
    }),
});
