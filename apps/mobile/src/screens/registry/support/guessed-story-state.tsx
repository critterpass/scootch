import { lazy } from 'react';

import { useLanguage } from '../../../i18n/i18n-provider';

import type { GuessedStory } from './guessed-story';
import { standardVariants, type ScreenState } from './screen-state';

// Loaded when a state is shown, so listing the registry never loads a screen.
const Panel = lazy(() =>
  import('./guessed-story').then((module) => ({ default: module.GuessedStoryPanel })),
);

const BOARD = 'Starting Helpers';
const SECTION = '03 After the catch';

/** One state of the composer on a story with a guess, answering to a screen of the board. */
export function guessedStoryState(id: string, screen: string, story: GuessedStory): ScreenState {
  function State() {
    const { language } = useLanguage();
    return <Panel story={story} language={language} />;
  }
  return {
    id,
    design: { board: BOARD, section: SECTION, screen },
    component: State,
    variants: standardVariants(),
  };
}
