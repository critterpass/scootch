import { fixtureModel, packLine } from '../../features/session/registry/fixtures';
import { CARE_BOARD, sessionState } from '../../features/session/registry/session-state';

/**
 * Finishing without holding: the tap-twice control, which a person who chose to say "done" also gets.
 */
export const sessionFinishTapTwice = sessionState({
  id: 'session-finish-tap-twice',
  design: { board: CARE_BOARD, section: '03 Accessibility', screen: 'Finish without holding' },
  model: (language) =>
    fixtureModel(
      language,
      { kind: 'finish', control: 'double_tap', timeUp: true },
      { minutesLeft: 0, fraction: 0, line: packLine(language, 'timeUp') },
    ),
});
