import { SEAT_CONTROLS, togetherState } from '../../features/table/registry/together-state';

/** The fourth nudge explains itself and is never sent. */
export const tableNudgeLimit = togetherState({
  id: 'table-nudge-limit',
  design: { ...SEAT_CONTROLS, screen: 'Nudge limit' },
  capture: 'nudge-limit',
});
