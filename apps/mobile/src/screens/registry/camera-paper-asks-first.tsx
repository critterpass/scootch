import { cameraState } from '../../features/camera/registry/camera-state';

/** The sheet that says what is sent, before the first Paper read leaves the phone. */
export const cameraPaperAsksFirst = cameraState({
  id: 'camera-paper-asks-first',
  screen: 'First Paper scan · asks first',

  capture: 'asks-first',
});
