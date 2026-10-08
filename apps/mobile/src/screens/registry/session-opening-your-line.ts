import { fixtureModel } from '../../features/session/registry/fixtures';
import { sessionState } from '../../features/session/registry/session-state';

const WORKING = {
  kind: 'working',
  quiet: false,
  stuck: false,
  twoMinutesLeft: false,
  timeUp: false,
  trap: false,
} as const;

/** What the person left for this sitting, in each language. None of it is anything Scootch says. */
const LINE = {
  en: 'reading his last email. Just reading',
  vi: 'đọc email gần nhất của anh ấy. Chỉ đọc thôi',
} as const;

/**
 * The next sitting opens on the line the person left the day before, word for word, before any
 * line of Scootch's.
 */
export const sessionOpeningYourLine = sessionState({
  id: 'session-opening-your-line',
  design: {
    board: 'Starting Helpers',
    section: '04 Not finished',
    screen: 'Session opening · your line first',
  },
  conditions: ['offline'],
  model: (language) =>
    fixtureModel(language, WORKING, {
      minutesLeft: 10,
      fraction: 1,
      opening: { text: LINE[language], label: 'yesterday', plain: false },
    }),
});
