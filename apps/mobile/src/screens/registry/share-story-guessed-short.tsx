import { guessedStoryState } from './support/guessed-story-state';

/**
 * The story of a catch that took longer than its guess: the same line in the same type and ink,
 * with nothing added.
 */
export const shareStoryGuessedShort = guessedStoryState(
  'share-story-guessed-short',
  'Share story · guessed short',
  { guessMinutes: 30, catchMinutes: 70, shown: true },
);
