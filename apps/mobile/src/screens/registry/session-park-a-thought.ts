import { fixtureModel } from '../../features/session/registry/fixtures';
import { sessionState } from '../../features/session/registry/session-state';

const WORKING = {
  kind: 'working',
  quiet: false,
  stuck: false,
  twoMinutesLeft: false,
  timeUp: false,
  trap: false,
} as const;

/**
 * Parking a thought: the composer's dock for a few words, typed over the keyboard or said.
 */
export const sessionParkAThought = sessionState({
  id: 'session-park-a-thought',
  design: null,
  undesignedReason:
    "The board draws the thought already parked; the few words have to be said or typed somewhere, so the field is the one screen's composer dock.",
  conditions: ['keyboard-open'],
  model: (language) => fixtureModel(language, WORKING, { parkOpen: true }),
});
