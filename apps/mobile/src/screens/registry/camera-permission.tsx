import { cameraState } from '../../features/camera/registry/camera-state';

/** Before the camera is allowed: why it is wanted, and the button that asks. */
export const cameraPermission = cameraState({
  id: 'camera-permission',
  screen: null,
  undesignedReason:
    'The board opens straight on the viewfinder; the camera must be asked for first, in the app’s own words, before the system’s question.',
  capture: 'permission',
});
