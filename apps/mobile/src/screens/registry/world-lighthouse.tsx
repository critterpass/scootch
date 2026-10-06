import { keepState } from '../../features/reveal/registry/keep-state';

/** The world of someone who bought lifetime: the lighthouse on its headland, above the first row. */
export const worldLighthouse = keepState({
  id: 'world-lighthouse',
  design: null,
  undesignedReason:
    'The Plus board says a lighthouse lands in the world but no world screen draws it. It stands on a headland above the first row, so no ordinary piece moves to make room.',
  capture: { screen: 'world', pieces: 7, lighthouse: true },
});
