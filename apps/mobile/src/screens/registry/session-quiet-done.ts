import { fixtureModel, plainLine } from '../../features/session/registry/fixtures';
import { sessionState } from '../../features/session/registry/session-state';

/**
 * A serious task finished: the plain line and one tap on. No burst, no card, no treat.
 */
export const sessionQuietDone = sessionState({
  id: 'session-quiet-done',
  design: null,
  undesignedReason:
    'The board shows a serious session only while it runs; its finish is the plain line and one tap on, with no burst, card or treat.',
  model: (language) =>
    fixtureModel(
      language,
      { kind: 'moment', quiet: true },
      { quiet: true, monster: null, line: plainLine(language, 'done') },
    ),
});
