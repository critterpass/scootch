import { lazy } from 'react';

import { useLanguage } from '../../../i18n/i18n-provider';
import {
  standardVariants,
  type DesignReference,
  type ScreenState,
} from '../../../screens/registry/support/screen-state';
import type { RevealStep } from '../reveal-steps';

// Loaded when a state is shown, so listing the registry never loads a screen.
const Captured = lazy(() =>
  import('./keep-captures').then((module) => ({ default: module.Captured })),
);

export const KEEPSAKES_BOARD = 'Monsters and Keepsakes';
export const SCOOTCH_BOARD = 'Scootch';
export const PLUS_BOARD = 'Plus';

/** Which keeping screen a capture shows, and with how much in it. */
export type KeepCapture =
  | { readonly screen: 'reveal'; readonly step: RevealStep }
  | { readonly screen: 'world'; readonly pieces: number }
  | {
      readonly screen: 'zoo';
      readonly cards: number;
      readonly plus: boolean;
      readonly open?: boolean;
    }
  | { readonly screen: 'record'; readonly bars: number }
  | { readonly screen: 'share' };

export interface KeepStateInput {
  readonly id: string;
  readonly design: DesignReference | null;
  readonly undesignedReason?: string;
  readonly capture: KeepCapture;
}

/**
 * One state of a keeping screen for the screen registry, in every language, both appearances and
 * both text sizes: the real screen, drawn from fixed keepsakes with nothing behind it, so a
 * capture never depends on a store, a clock or the phone's own tables.
 */
export function keepState(input: KeepStateInput): ScreenState {
  function State() {
    const { language } = useLanguage();
    return <Captured capture={input.capture} language={language} />;
  }
  return {
    id: input.id,
    design: input.design,
    ...(input.undesignedReason ? { undesignedReason: input.undesignedReason } : {}),
    component: State,
    variants: standardVariants(),
  };
}
