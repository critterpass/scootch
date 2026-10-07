import { cameraState } from '../../features/camera/registry/camera-state';

/** Paper or Screen with no connection. */
export const cameraNeedsConnection = cameraState({
  id: 'camera-needs-connection',
  screen: null,
  undesignedReason:
    'The board draws Paper and Screen online only; without a connection they say so, and Desk and Room still work.',
  capture: 'needs-connection',
});
