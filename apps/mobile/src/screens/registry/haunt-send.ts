import { HAUNT_BOARD, togetherState } from '../../features/table/registry/together-state';

/** Sending a monster with a preset dare. */
export const hauntSend = togetherState({
  id: 'haunt-send',
  design: { ...HAUNT_BOARD, screen: 'Haunt a friend · send' },
  capture: 'haunt-send',
});
