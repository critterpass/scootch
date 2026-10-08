import { fixtureModel } from '../../features/session/registry/fixtures';
import { sessionState } from '../../features/session/registry/session-state';

/**
 * "Next time, start with…": the sheet after Carry on tomorrow, with one field, typed or said.
 */
export const sessionNextTime = sessionState({
  id: 'session-next-time',
  design: {
    board: 'Starting Helpers',
    section: '04 Not finished',
    screen: 'Next time, start with…',
  },
  conditions: ['keyboard-open', 'offline'],
  model: (language) => fixtureModel(language, { kind: 'not_finished' }, { nextTimeOpen: true }),
});
