import { cameraState } from '../../features/camera/registry/camera-state';

/** A photographed screen with the one row that matters lit, and a first line to send. */
export const cameraScreenOneEmail = cameraState({
  id: 'camera-screen-one-email',
  screen: 'Screen · the one email · Plus',

  capture: 'screen',
});
