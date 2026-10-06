import type { ComponentType } from 'react';

import { languages, type Language } from '@scootch/i18n';
import type { ColorScheme } from '@scootch/tokens';

/** `largest` is the largest accessibility text size the platform offers. */
export type TextSize = 'default' | 'largest';

/** A circumstance a state must also be captured in, where it changes what the screen shows. */
export type Condition = 'keyboard-open' | 'empty' | 'offline' | 'long-text';

/** One way a screen state is captured for its sheet. */
export interface ScreenVariant {
  readonly language: Language;
  readonly appearance: ColorScheme;
  readonly textSize: TextSize;
  readonly condition?: Condition;
}

/** The designed screen a state is built from, named as `design/screens.json` names it. */
export interface DesignReference {
  readonly board: string;
  readonly section: string;
  readonly screen: string;
}

/** One state of one screen: what it is, which design it answers to, and how it is captured. */
export interface ScreenState {
  /** Lower-case words joined by single hyphens; also the first half of a capture's file name. */
  readonly id: string;
  /** `null` only for a state nobody designed, and then `undesignedReason` says why it exists. */
  readonly design: DesignReference | null;
  readonly undesignedReason?: string;
  /** Loaded when the state is shown, so listing the registry never loads a screen. */
  readonly component: ComponentType;
  readonly variants: readonly ScreenVariant[];
}

const appearances: readonly ColorScheme[] = ['light', 'dark'];
const textSizes: readonly TextSize[] = ['default', 'largest'];

/**
 * Every language in both appearances at both text sizes. With conditions, the same set once more
 * for each of them.
 */
export function standardVariants(conditions: readonly Condition[] = []): ScreenVariant[] {
  const plain = languages.flatMap((language) =>
    appearances.flatMap((appearance) =>
      textSizes.map((textSize): ScreenVariant => ({ language, appearance, textSize })),
    ),
  );
  return [
    ...plain,
    ...conditions.flatMap((condition) => plain.map((variant) => ({ ...variant, condition }))),
  ];
}

/** `vi-dark-largest`, or `vi-dark-largest-offline` under a condition. */
export function variantName(variant: ScreenVariant): string {
  const parts: string[] = [variant.language, variant.appearance, variant.textSize];
  if (variant.condition !== undefined) parts.push(variant.condition);
  return parts.join('-');
}

/** Names one capture: the file a device run saves and the test ids of its row and its screen. */
export function captureName(state: ScreenState, variant: ScreenVariant): string {
  return `${state.id}--${variantName(variant)}`;
}
