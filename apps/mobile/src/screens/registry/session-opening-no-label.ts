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
 * The line was written on some other day than the one before: it is shown with no label at all.
 */
export const sessionOpeningNoLabel = sessionState({
  id: 'session-opening-no-label',
  design: null,
  undesignedReason:
    'The board draws the line the day after it was written; on any other day it carries no label, so nothing says how long ago that was.',
  model: (language) =>
    fixtureModel(language, WORKING, {
      minutesLeft: 10,
      fraction: 1,
      opening: { text: LINE[language], label: null, plain: false },
    }),
});
