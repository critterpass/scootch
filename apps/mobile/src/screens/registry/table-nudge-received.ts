import { TABLES_ROOM, togetherState } from '../../features/table/registry/together-state';

/** A silent wave from a tablemate. */
export const tableNudgeReceived = togetherState({
  id: 'table-nudge-received',
  design: { ...TABLES_ROOM, screen: 'Nudge received' },
  capture: 'nudge-received',
});
