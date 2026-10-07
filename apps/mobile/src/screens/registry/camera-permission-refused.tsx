import { cameraState } from '../../features/camera/registry/camera-state';

/** The camera was refused: a plain sentence and the way to Settings. */
export const cameraPermissionRefused = cameraState({
  id: 'camera-permission-refused',
  screen: null,
  undesignedReason:
    'The board draws no refusal; iOS will not ask twice, so the way on is the app’s page in Settings.',
  capture: 'permission-refused',
});
