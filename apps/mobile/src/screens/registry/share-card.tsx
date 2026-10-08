import { keepState } from '../../features/reveal/registry/keep-state';

/** The share panel on the trading card of a catch, in the finish that is worn. */
export const shareCard = keepState({
  id: 'share-card',
  design: null,
  undesignedReason:
    'The board draws the composer on a story. The card that turns in the hand is kept as a third format beside Story and Sticker, since it is already shared as a video.',
  capture: { screen: 'share', format: 'card' },
});
