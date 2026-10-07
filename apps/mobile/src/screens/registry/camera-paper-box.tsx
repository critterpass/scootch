import { cameraState } from '../../features/camera/registry/camera-state';

/** A page with its boxes numbered and the easiest one lit. */
export const cameraPaperBox = cameraState({
  id: 'camera-paper-box',
  screen: 'Paper · one box at a time · Plus',

  capture: 'paper',
});
