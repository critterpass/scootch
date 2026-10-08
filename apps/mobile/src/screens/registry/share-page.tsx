import { keepState } from '../../features/reveal/registry/keep-state';

/** The composer on a month's page as the binder's own leaf, with the poster as its other style. */
export const sharePage = keepState({
  id: 'share-page',
  design: null,
  undesignedReason:
    'The board draws a month shared as its poster only. The binder\u2019s "Share this page" opens on the leaf the person was looking at, with the poster one tap away.',
  capture: { screen: 'share', format: 'page' },
});
