import { fixtureModel } from '../../features/session/registry/fixtures';
import { sessionState } from '../../features/session/registry/session-state';

const WORKING = {
  kind: 'working',
  quiet: false,
  stuck: false,
  twoMinutesLeft: false,
  timeUp: false,
} as const;

/**
 * Parking a thought: one field for a few words, over the keyboard.
 */
export const sessionParkAThought = sessionState({
  id: 'session-park-a-thought',
  design: null,
  undesignedReason:
    "The board draws the thought already parked; the few words have to be typed somewhere, so the field is built from the stuck card's shape.",
  conditions: ['keyboard-open'],
  model: (language) => fixtureModel(language, WORKING, { parkOpen: true }),
});
