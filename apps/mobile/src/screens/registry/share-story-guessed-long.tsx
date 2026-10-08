import { guessedStoryState } from './support/guessed-story-state';

/** The story of a catch that was guessed at two hours and took eleven minutes. */
export const shareStoryGuessedLong = guessedStoryState(
  'share-story-guessed-long',
  'Share story · guessed long',
  { guessMinutes: 120, catchMinutes: 11, shown: true },
);
