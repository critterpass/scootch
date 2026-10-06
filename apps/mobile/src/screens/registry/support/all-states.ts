import * as entries from '../index.generated';
import { captureName, type ScreenState, type ScreenVariant } from './screen-state';

/** Every registered screen state: one per file in the registry folder. */
export const screenStates: readonly ScreenState[] = Object.values(entries);

export interface Capture {
  /** `<state id>--<variant>`. */
  readonly name: string;
  readonly state: ScreenState;
  readonly variant: ScreenVariant;
}

/** Every capture the registry asks for, in registry order. */
export const captures: readonly Capture[] = screenStates.flatMap((state) =>
  state.variants.map((variant) => ({ name: captureName(state, variant), state, variant })),
);
