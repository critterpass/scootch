import { keepState } from '../../features/reveal/registry/keep-state';

/**
 * A card whose task was guessed at before starting: one plain line under its stats.
 */
export const zooCardGuessed = keepState({
  id: 'zoo-card-guessed',
  design: {
    board: 'Starting Helpers',
    section: '03 After the catch',
    screen: 'Caught card · stat line',
  },
  capture: { screen: 'zoo', cards: 12, plus: false, open: true, guessMinutes: 120 },
});
