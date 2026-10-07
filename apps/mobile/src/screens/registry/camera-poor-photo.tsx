import { cameraState } from '../../features/camera/registry/camera-state';

/** A blurred page: what went wrong in plain words, and a retake. */
export const cameraPoorPhoto = cameraState({
  id: 'camera-poor-photo',
  screen: null,
  undesignedReason: 'The board draws only sharp, flat pages.',
  capture: 'poor',
});
