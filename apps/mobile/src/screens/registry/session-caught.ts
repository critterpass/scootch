import { fixtureModel, packLine } from '../../features/session/registry/fixtures';
import { sessionState } from '../../features/session/registry/session-state';

/**
 * The finish itself when no treat was named: the caught line, and one tap on.
 */
export const sessionCaught = sessionState({
  id: 'session-caught',
  design: null,
  undesignedReason:
    'The board goes from the hold straight to the card reveal, which is not built here; a finish with no treat still needs somewhere to say the caught line, so it uses the treat screen without the treat.',
  model: (language) =>
    fixtureModel(
      language,
      { kind: 'moment', quiet: false },
      { line: packLine(language, 'caught') },
    ),
});
