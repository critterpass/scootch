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
  id: 'session-others-hunting',
  design: { board: 'Starting Helpers', section: '06 Company', screen: 'Session · footer' },
  model: (language) =>
    fixtureModel(language, WORKING, { minutesLeft: 7, line: packLine(language, 'working') }),
});
const Running = running.component;

/** The session at work with the count of others over the pill, as the phone writes it. */
export const sessionOthersHunting = {
  ...running,
  component: function OthersHunting() {
    return (
      <OthersHuntingFixed.Provider value={214}>
        <Running />
      </OthersHuntingFixed.Provider>
    );
  },
};
