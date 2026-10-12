import { lazy } from 'react';

import { useLanguage } from '../../../i18n/i18n-provider';

import type { GuessedCard } from './guessed-card';
import { standardVariants, type ScreenState } from './screen-state';

// Loaded when a state is shown, so listing the registry never loads a screen.
const Panel = lazy(() =>
  import('./guessed-card').then((module) => ({ default: module.GuessedCardPanel })),
);

/** One state of the composer on a trading card with a guess. The board draws only the story's. */
export function guessedCardState(id: string, guess: GuessedCard): ScreenState {
  function State() {
    const { language } = useLanguage();
    return <Panel guess={guess} language={language} />;
  }
  return {
    id,
    design: null,
    undesignedReason:
      'The board draws the guess switch on the story only. The card offers the same switch, and prints the same line under its facts, so the picture matches its page.',
    component: State,
    variants: standardVariants(),
  };
}
