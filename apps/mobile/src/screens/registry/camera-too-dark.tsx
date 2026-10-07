import { cameraState } from '../../features/camera/registry/camera-state';

/** A photo too dark to read: a plain sentence and a retake. */
export const cameraTooDark = cameraState({
  id: 'camera-too-dark',
  screen: null,
  undesignedReason: 'The board draws only well-lit photos.',
  capture: 'dark',
});
