import { OthersHuntingFixed } from '../../features/session/screens/others-hunting-fixed';
import { fixtureModel, packLine } from '../../features/session/registry/fixtures';
import { sessionState } from '../../features/session/registry/session-state';

const WORKING = {
  kind: 'working',
  quiet: false,
  stuck: false,
  twoMinutesLeft: false,
  timeUp: false,
  trap: false,
} as const;

const running = sessionState({
  id: 'session-others-hunting-absent',
  design: { board: 'Starting Helpers', section: '06 Company', screen: 'Session · footer absent' },
  model: (language) =>
    fixtureModel(language, WORKING, { minutesLeft: 7, line: packLine(language, 'working') }),
});
const Running = running.component;

/**
 * Offline, under twenty, at a table, on a serious task or switched off: no line, and the session
 * is the one the person knows.
 */
export const sessionOthersHuntingAbsent = {
  ...running,
  component: function OthersHuntingAbsent() {
    return (
      <OthersHuntingFixed.Provider value={null}>
        <Running />
      </OthersHuntingFixed.Provider>
    );
  },
};
