import { togetherState } from '../../features/table/registry/together-state';

/** Muted and blocked: the person's own mutes and blocks, each with the tap that undoes it. */
export const tableQuieted = togetherState({
  id: 'table-quieted',
  design: null,
  undesignedReason:
    'The board draws the "Muted and blocked" row with its count, and no page behind it',
  capture: 'tables-quieted',
});
