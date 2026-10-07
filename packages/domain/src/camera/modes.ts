/** The four ways the camera reads a photo, in the order of the chips. It opens on Desk. */
export const CAMERA_MODES = ['desk', 'paper', 'screen', 'room'] as const;
export type CameraMode = (typeof CAMERA_MODES)[number];

/** Read on the phone from start to finish: the photo never leaves, so nothing is asked. */
export const ON_PHONE_MODES = ['desk', 'room'] as const satisfies readonly CameraMode[];
/** Read by sending the words found in the photo out: Plus, with one free try, and asked first. */
export const SENT_MODES = ['paper', 'screen'] as const satisfies readonly CameraMode[];
export type SentMode = (typeof SENT_MODES)[number];

export function isSentMode(mode: CameraMode): mode is SentMode {
  return (SENT_MODES as readonly CameraMode[]).includes(mode);
}
