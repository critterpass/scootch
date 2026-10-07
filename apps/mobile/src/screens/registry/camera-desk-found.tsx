import { cameraState } from '../../features/camera/registry/camera-state';

/** A desk with one thing ringed and everything else faded back. */
export const cameraDeskFound = cameraState({
  id: 'camera-desk-found',
  screen: 'Desk · first step found',

  capture: 'desk',
});
