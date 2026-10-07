import { cameraState } from '../../features/camera/registry/camera-state';

/** The viewfinder once both free tries are used: Paper and Screen wear the quiet lock. */
export const cameraTriesSpent = cameraState({
  id: 'camera-tries-spent',
  screen: null,
  undesignedReason:
    'The board marks Paper and Screen as Plus but draws no locked chip; the quiet lock is the one the Plus board uses.',
  capture: 'tries-spent',
});
