import { guessedCardState } from './support/guessed-card-state';

/** The trading card of a catch that was guessed at two hours and took eleven minutes. */
export const shareCardGuessed = guessedCardState('share-card-guessed', {
  guessMinutes: 120,
  catchMinutes: 11,
  shown: true,
});
