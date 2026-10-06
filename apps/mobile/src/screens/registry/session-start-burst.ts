import { fixtureModel, packLine } from '../../features/session/registry/fixtures';
import { SCOOTCH_BOARD, sessionState } from '../../features/session/registry/session-state';

/**
 * The moment the session begins: Scootch celebrating and the start line, under the burst. A capture
 * is taken with motion reduced, so it shows the soft glow's screen and no flying marks.
 */
export const sessionStartBurst = sessionState({
  id: 'session-start-burst',
  design: { board: SCOOTCH_BOARD, section: '04 Session', screen: 'Start burst · live' },
  model: (language) =>
    fixtureModel(language, { kind: 'burst' }, { line: packLine(language, 'start') }),
});
