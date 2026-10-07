import type { SharedValue } from 'react-native-reanimated';

import type { ComposerEvent, ComposerState } from './composer-machine';

/** What both shapes of the dock (the row, and the stack for large text) are drawn from. */
export interface ComposerParts {
  readonly state: ComposerState;
  /** The voice's level, from 0 to 1. */
  readonly level: number;
  readonly listening: boolean;
  readonly busy: boolean;
  readonly screenReader: boolean;
  readonly drag: SharedValue<number>;
  readonly onEvent: (event: ComposerEvent) => void;
}

/** The switch between talking and typing, in words, for either shape of the dock. */
export function switchWords(typing: boolean) {
  return typing
    ? ({ label: 'composer.talkInstead', hint: 'composer.talkInstead.hint' } as const)
    : ({ label: 'composer.typeIt', hint: 'composer.typeIt.hint' } as const);
}

/** The switch is there while talking, and while typing only if the phone can listen. */
export function showsSwitch(state: ComposerState): boolean {
  return state.mode !== 'typing' || state.voice === 'ready' || state.voice === 'unasked';
}
