import { HAUNT_BOARD, togetherState } from '../../features/table/registry/together-state';

/** A waiting haunt: catch it or shoo it. */
export const hauntReceived = togetherState({
  id: 'haunt-received',
  design: { ...HAUNT_BOARD, screen: 'Haunt a friend · received' },
  capture: 'haunt-received',
});
