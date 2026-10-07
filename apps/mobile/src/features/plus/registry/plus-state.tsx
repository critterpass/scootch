import { lazy } from 'react';

import type { Attitude } from '@scootch/domain';

import {
  standardVariants,
  type DesignReference,
  type ScreenState,
} from '../../../screens/registry/support/screen-state';
import type { StudioKind } from '../../studio/catalogue';
import type { PlanId } from '../products';

// Loaded when a state is shown, so listing the registry never loads a screen.
const Captured = lazy(() =>
  import('./plus-captures').then((module) => ({ default: module.Captured })),
);

export const PLUS_BOARD = 'Plus';
export const WHERE_IT_LIVES = '01 Scootch Plus · where it lives';
export const THE_SHEET = '02 Scootch Plus · the sheet';
export const TRIAL_AND_RENEWAL = '03 Trial, renewal and turning it off';
export const LIFETIME_SHELF_MANAGE = '04 Friends, gifts, lifetime, shelf and manage';

/** The board that redrew the sheet, the purchase moment, the studio and the member card. */
export const MATERIALS_BOARD = 'Plus Materials';
export const DRESSED_SHEET = '02 The sheet, dressed up';
export const THE_STUDIO = '03 The studio';

/** Which Plus screen a capture shows, and in what state. */
export type PlusCapture =
  | {
      readonly screen: 'sheet';
      readonly attitude: Attitude;
      readonly plan: PlanId;
      readonly phase?: 'loading' | 'unavailable' | 'purchasing' | 'failed';
      readonly oneMore?: boolean;
      /** A day with something heavy in it: the sheet opens with nothing spoken. */
      readonly heavyDay?: boolean;
    }
  | { readonly screen: 'offer' }
  | { readonly screen: 'charge-note' }
  | { readonly screen: 'welcome'; readonly customer: 'trial' | 'monthly' | 'lifetime' }
  | { readonly screen: 'last-day' }
  | { readonly screen: 'renewal-off'; readonly after: 'renewal_off' | 'cancelled' }
  | { readonly screen: 'manage'; readonly customer: 'free' | 'trial' | 'yearly' | 'lifetime' }
  | { readonly screen: 'record-shelf'; readonly records: number }
  | {
      readonly screen: 'studio';
      readonly tab: StudioKind;
      /** The item in focus on the tab, and whether this Apple ID has bought and put it on. */
      readonly trying: string;
      readonly worn: boolean;
    };

export interface PlusStateInput {
  readonly id: string;
  readonly design: DesignReference | null;
  readonly undesignedReason?: string;
  readonly capture: PlusCapture;
}

/**
 * One state of a Plus screen for the screen registry, in every language, both appearances and
 * both text sizes: the real screen on a fake store, so a capture never reaches the App Store and
 * never shows a price the app wrote itself.
 */
export function plusState(input: PlusStateInput): ScreenState {
  function State() {
    return <Captured capture={input.capture} />;
  }
  return {
    id: input.id,
    design: input.design,
    ...(input.undesignedReason ? { undesignedReason: input.undesignedReason } : {}),
    component: State,
    variants: standardVariants(),
  };
}
