import type { ReactNode } from 'react';

import type { ComposerViewProps } from '../composer/composer-view';

import type { TaskSetChoicesProps } from './one-screen-panels';

/** What the screen is showing under Scootch and his sentence. */
export type OneScreenShown =
  | {
      readonly kind: 'composer';
      readonly composer: ComposerViewProps;
      /** The first ask after first launch: the example chips and the last step mark. */
      readonly warmUp: {
        readonly chips: readonly string[];
        readonly onChip: (text: string) => void;
      } | null;
      /** Said once, straight after the system's prompt was refused, and never again. */
      readonly notificationsOff: boolean;
      /**
       * Home's own parts around the composer: the world card above the dock, and what waits for
       * tomorrow. Both step aside while the person is talking or typing. Unset on the warm-up
       * ask, which is still first launch.
       */
      readonly home?: {
        /** The task carried on to tomorrow, said plainly while nothing else is going on. */
        readonly waiting: string | null;
        /** Said under it when the day's free starts are used and the capsule is locked. */
        readonly startsNote: string | null;
      };
      /** Small ways in under the ask: the chips of a return. */
      readonly ways?: {
        readonly chips: readonly string[];
        readonly onChip: (text: string) => void;
        readonly hint: string;
        /** A dated thing that is close, said quietly beside the ask. */
        readonly note: string | null;
      };
    }
  | ({
      readonly kind: 'task_set';
      /** The person's own words for the task, shown when Scootch has no line about it yet. */
      readonly taskText: string | null;
      /** `null` draws Start disabled: it would be refused, and `label` says why. */
      readonly onStart: (() => void) | null;
      /** A small line above the task: a morning's greeting, or the plain words of a serious task. */
      readonly label?: string | null;
      /** The label of the one action, when it is not the plain "Start". */
      readonly startLabel?: string;
      /** The round button left of Start: the task is put down. Unset, no button is drawn. */
      readonly onDiscard?: () => void;
      /** Quiet controls under the choices: sitting with someone. */
      readonly extra?: ReactNode;
      /** Drawn in place of Scootch alone, when the task's monster stands beside him. */
      readonly figure?: ReactNode;
    } & TaskSetChoicesProps)
  /** A state drawn by its own feature: the one thing, the hatch, a counter-offer. */
  | {
      readonly kind: 'panel';
      /** Names the state in its test id. */
      readonly name: string;
      /** Drawn in place of Scootch and his sentence, when the state has its own figure. */
      readonly figure?: ReactNode;
      readonly body: ReactNode;
      readonly footer: ReactNode;
    }
  /** Nothing is asked and nothing is offered. */
  | { readonly kind: 'quiet' };
