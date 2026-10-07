import { cameraState } from '../../features/camera/registry/camera-state';

/** The viewfinder in Desk mode: Scootch looking on, the four modes and the shutter. */
export const cameraViewfinder = cameraState({
  id: 'camera-viewfinder',
  screen: 'Viewfinder · looking',

  capture: 'looking',
});
