import { keepState } from '../../features/reveal/registry/keep-state';

/** The world before anything has been finished. */
export const worldEmpty = keepState({
  id: 'world-empty',
  design: null,
  undesignedReason:
    'The board starts the world at one piece; a phone on day zero can still open the world, so it shows the ground and says what will move in.',
  capture: { screen: 'world', pieces: 0 },
});
