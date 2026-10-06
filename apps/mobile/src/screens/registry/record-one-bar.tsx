import { keepState } from '../../features/reveal/registry/keep-state';

/** The first week's record, with one bar. */
export const recordOneBar = keepState({
  id: 'record-one-bar',
  design: null,
  undesignedReason:
    'The board draws two bars and seven; a first week with a single bar is the smallest band there is and still plays, so it has a capture of its own.',
  capture: { screen: 'record', bars: 1 },
});
