import { TABLES_ROOM, togetherState } from '../../features/table/registry/together-state';

/** The label switch off: the seat says "busy". */
export const tableLabelHidden = togetherState({
  id: 'table-label-hidden',
  design: { ...TABLES_ROOM, screen: 'Labels at tables' },
  capture: 'label-hidden',
});
