import { lazy } from 'react';

import type { Language } from '@scootch/i18n';

import { useLanguage } from '../../../i18n/i18n-provider';
import type {
  Condition,
  DesignReference,
  ScreenState,
} from '../../../screens/registry/support/screen-state';
import { standardVariants } from '../../../screens/registry/support/screen-state';
import type { SessionModel } from '../screens/screen-props';

import { NO_ACTIONS } from './fixtures';

// Loaded when a state is shown, so listing the registry never loads a screen.
const SessionScreen = lazy(() =>
  import('../session-screen').then((module) => ({ default: module.SessionScreen })),
);

export const SCOOTCH_BOARD = 'Scootch';
export const CARE_BOARD = 'Care and Edge States';

export interface SessionStateInput {
  readonly id: string;
  readonly design: DesignReference | null;
  readonly undesignedReason?: string;
  readonly conditions?: readonly Condition[];
  /** The state as the screens draw it, in one language. */
  readonly model: (language: Language) => SessionModel;
}

/**
 * One state of the session for the screen registry: the real screens, drawn from a fixed model
 * with nothing behind them, so a capture never depends on a store, a clock or a connection.
 */
export function sessionState(input: SessionStateInput): ScreenState {
  function Captured() {
    const { language } = useLanguage();
    return <SessionScreen model={input.model(language)} actions={NO_ACTIONS} />;
  }
  return {
    id: input.id,
    design: input.design,
    ...(input.undesignedReason ? { undesignedReason: input.undesignedReason } : {}),
    component: Captured,
    variants: standardVariants(input.conditions),
  };
}
