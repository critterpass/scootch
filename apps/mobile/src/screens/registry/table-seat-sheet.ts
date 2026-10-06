import { SEAT_CONTROLS, togetherState } from '../../features/table/registry/together-state';

/** A long press on a seat: mute, report, block, leave. */
export const tableSeatSheet = togetherState({
  id: 'table-seat-sheet',
  design: { ...SEAT_CONTROLS, screen: "A stranger's seat" },
  capture: 'seat-sheet',
});
