import { keepState } from '../../features/reveal/registry/keep-state';

/** The world at sixty pieces, on the island's smallest scale. */
export const worldSixtyPieces = keepState({
  id: 'world-sixty-pieces',
  design: null,
  undesignedReason:
    'The board draws one week and three months; sixty pieces is the size in between, the first where the island is at its widest and its residents at their smallest, so it has a capture of its own.',
  capture: { screen: 'world', pieces: 60 },
});
