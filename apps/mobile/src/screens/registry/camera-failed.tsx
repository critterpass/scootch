import { cameraState } from '../../features/camera/registry/camera-state';

/** A read that failed. */
export const cameraFailed = cameraState({
  id: 'camera-failed',
  screen: null,
  undesignedReason: 'The board draws no failure; a read that failed says so and spends nothing.',
  capture: 'failed',
});
