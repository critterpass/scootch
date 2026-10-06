import { keepState } from '../../features/reveal/registry/keep-state';

/** The world at sixty pieces, where it starts to scroll. */
export const worldSixtyPieces = keepState({
  id: 'world-sixty-pieces',
  design: null,
  undesignedReason:
    'The board draws one week and three months; sixty pieces is the size in between where the rows first run off the screen, so it has a capture of its own.',
  capture: { screen: 'world', pieces: 60 },
});
