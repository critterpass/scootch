import type { Language } from '@scootch/i18n';
import { noTaskLine } from '@scootch/voice';

import { fixtureModel } from '../../features/session/registry/fixtures';
import { CARE_BOARD, sessionState } from '../../features/session/registry/session-state';

const WORKING = {
  kind: 'working',
  quiet: false,
  stuck: false,
  twoMinutesLeft: false,
  timeUp: false,
  trap: false,
} as const;

const hatchesLater = (language: Language) =>
  ({ slot: 'working', text: noTaskLine(language, 'cheeky', 'hatchesWhenBack') }) as const;

/**
 * A session running with no connection: the timer and the finish are the phone's own, and Scootch
 * says when the monster will come.
 */
export const sessionOffline = sessionState({
  id: 'session-offline',
  design: {
    board: CARE_BOARD,
    section: '02 Offline and AI unavailable',
    screen: 'Offline · session running',
  },
  model: (language) =>
    fixtureModel(language, WORKING, {
      monster: null,
      minutesLeft: 6,
      fraction: 0.6,
      line: hatchesLater(language),
    }),
});
