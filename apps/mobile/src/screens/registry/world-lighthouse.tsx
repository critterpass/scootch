import { keepState } from '../../features/reveal/registry/keep-state';

/** The world of someone who bought lifetime: the lighthouse at the back of the island. */
export const worldLighthouse = keepState({
  id: 'world-lighthouse',
  design: null,
  undesignedReason:
    'The Plus board says a lighthouse lands in the world but no world screen places it. It stands at the back of the island, where nothing else is placed, so no resident moves to make room.',
  capture: { screen: 'world', pieces: 7, lighthouse: true },
});
