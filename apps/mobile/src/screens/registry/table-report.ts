import { SEAT_CONTROLS, togetherState } from '../../features/table/registry/together-state';

/** The four fixed reasons, and "also leave". */
export const tableReport = togetherState({
  id: 'table-report',
  design: { ...SEAT_CONTROLS, screen: 'Report' },
  capture: 'report',
});
