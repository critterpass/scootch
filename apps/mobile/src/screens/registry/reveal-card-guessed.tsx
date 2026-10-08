import { keepState } from '../../features/reveal/registry/keep-state';

/** The card of the catch, face up, for a task that was guessed at: one plain line under its stats. */
export const revealCardGuessed = keepState({
  id: 'reveal-card-guessed',
  design: {
    board: 'Starting Helpers',
    section: '03 After the catch',
    screen: 'Caught card · stat line',
  },
  capture: { screen: 'reveal', step: 'card', guessMinutes: 120 },
});
