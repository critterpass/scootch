import { cameraState } from '../../features/camera/registry/camera-state';

/** Nothing to pick out of the photo: a plain sentence and a retake. */
export const cameraNothingFound = cameraState({
  id: 'camera-nothing-found',
  screen: null,
  undesignedReason: 'The board draws only photos with something in them.',
  capture: 'nothing',
});
