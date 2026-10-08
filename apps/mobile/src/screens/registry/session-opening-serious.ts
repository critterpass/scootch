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
 * A serious task opens on the line too, shown plain: the same words with nothing around them.
 */
export const sessionOpeningSerious = sessionState({
  id: 'session-opening-serious',
  design: null,
  undesignedReason:
    'The board draws the opening for a task with a monster; a serious task keeps its line, shown plain on the quiet session.',
  model: (language) =>
    fixtureModel(
      language,
      { ...WORKING, quiet: true },
      {
        quiet: true,
        monster: null,
        minutesLeft: 10,
        fraction: 1,
        opening: { text: LINE[language], label: 'yesterday', plain: true },
      },
    ),
});
