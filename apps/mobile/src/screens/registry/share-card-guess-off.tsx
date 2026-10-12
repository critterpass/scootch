import { guessedCardState } from './support/guessed-card-state';

/** The composer after the switch took the guess line off the card: the card as it always was. */
export const shareCardGuessOff = guessedCardState('share-card-guess-off', {
  guessMinutes: 120,
  catchMinutes: 11,
  shown: false,
});
