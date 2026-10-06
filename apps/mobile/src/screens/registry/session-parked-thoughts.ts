import { fixtureModel, thoughtsOf } from '../../features/session/registry/fixtures';
import { SCOOTCH_BOARD, sessionState } from '../../features/session/registry/session-state';

/**
 * The thoughts parked during the session, each with Tomorrow or Let go.
 */
export const sessionParkedThoughts = sessionState({
  id: 'session-parked-thoughts',
  design: {
    board: SCOOTCH_BOARD,
    section: '05 Hold to finish and rewards',
    screen: 'Your parked thoughts',
  },
  conditions: ['long-text'],
  model: (language) => fixtureModel(language, { kind: 'thoughts', thoughts: thoughtsOf(language) }),
});
