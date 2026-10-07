import type { Language } from '@scootch/i18n';

import type { Condition, ScreenState } from '../../../screens/registry/support/screen-state';
import type { CatchKind } from '../catch/catch-kinds';
import type { SessionModel } from '../screens/screen-props';
import type { SessionView } from '../session-view';

import { fixtureModel, mateMonster } from './fixtures';
import { sessionState } from './session-state';

/** Part-way through a session that ends in a catch. */
export const TRAP_SETTING = {
  kind: 'working',
  quiet: false,
  stuck: false,
  twoMinutesLeft: false,
  timeUp: false,
  trap: true,
} as const satisfies SessionView;

const MONTH = { en: 'October', vi: 'Tháng 10' } as const satisfies Record<Language, string>;

export interface CatchStateInput {
  readonly id: string;
  readonly kind: CatchKind;
  readonly view: SessionView;
  readonly conditions?: readonly Condition[];
  readonly changes?: (language: Language) => Partial<SessionModel>;
}

/**
 * One state of a session that ends in a catch, for the screen registry: forty-one monsters in the
 * binder, and five of this month's on the sticker page.
 */
export function catchState(input: CatchStateInput): ScreenState {
  return sessionState({
    id: input.id,
    design: null,
    undesignedReason:
      'The Catch Concepts board lives in Claude Design and is not yet among the boards exported to design/, so design/screens.json has no screen to point this state at.',
    ...(input.conditions ? { conditions: input.conditions } : {}),
    model: (language) =>
      fixtureModel(language, input.view, {
        minutesLeft: 5,
        fraction: 0.45,
        catch: {
          kind: input.kind,
          caughtCount: 41,
          monthMates: ['sock', 'beetle', 'letter', 'slime', 'clock'].map(mateMonster),
          monthName: MONTH[language],
        },
        ...input.changes?.(language),
      }),
  });
}
