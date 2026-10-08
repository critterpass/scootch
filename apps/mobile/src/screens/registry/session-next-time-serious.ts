import { fixtureModel } from '../../features/session/registry/fixtures';
import { sessionState } from '../../features/session/registry/session-state';

/**
 * The same sheet after a serious task is carried on: plain company, and the line is still offered.
 */
export const sessionNextTimeSerious = sessionState({
  id: 'session-next-time-serious',
  design: null,
  undesignedReason:
    'The board draws the sheet for a task with a monster; a serious task keeps the line too, so the same sheet is shown with Scootch in plain company.',
  conditions: ['keyboard-open'],
  model: (language) =>
    fixtureModel(
      language,
      { kind: 'not_finished' },
      { nextTimeOpen: true, quiet: true, monster: null },
    ),
});
