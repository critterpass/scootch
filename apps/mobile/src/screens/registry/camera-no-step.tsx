import { cameraState } from '../../features/camera/registry/camera-state';

/** A page that asks nothing of the person: a plain sentence and a retake. */
export const cameraNoStep = cameraState({
  id: 'camera-no-step',
  screen: null,
  undesignedReason: 'The board draws only pages that ask something of the person.',
  capture: 'no-step',
});
