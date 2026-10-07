import { cameraState } from '../../features/camera/registry/camera-state';

/** A room split into corners, with the smallest one lit. */
export const cameraRoomCorner = cameraState({
  id: 'camera-room-corner',
  screen: 'Room · pick a corner',

  capture: 'room',
});
