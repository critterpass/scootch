import { guessedStoryState } from './support/guessed-story-state';

/** The composer after the one switch took the guess line off the story: the story as it always was. */
export const shareStoryGuessOff = guessedStoryState('share-story-guess-off', 'The stat line', {
  guessMinutes: 120,
  catchMinutes: 11,
  shown: false,
});
