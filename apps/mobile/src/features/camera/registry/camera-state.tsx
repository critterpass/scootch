import { lazy } from 'react';

import {
  standardVariants,
  type DesignReference,
  type ScreenState,
} from '../../../screens/registry/support/screen-state';

// Loaded when a state is shown, so listing the registry never loads a screen.
const Captured = lazy(() =>
  import('./camera-captures').then((module) => ({ default: module.Captured })),
);

export const CAMERA_BOARD = 'Camera';
export const CAMERA_SECTION = '01 Camera';

/** Which state of the camera a capture shows. */
export type CameraCapture =
  | 'permission'
  | 'permission-refused'
  | 'looking'
  | 'tries-spent'
  | 'desk'
  | 'room'
  | 'paper'
  | 'paper-explained'
  | 'asks-first'
  | 'screen'
  | 'nothing'
  | 'no-step'
  | 'dark'
  | 'poor'
  | 'needs-connection'
  | 'failed'
  | 'heavy'
  | 'crisis';

export interface CameraStateInput {
  readonly id: string;
  /** The board's name for the screen, or `null` with a reason for a state nobody designed. */
  readonly screen: string | null;
  readonly undesignedReason?: string;
  readonly capture: CameraCapture;
}

/**
 * One state of the camera for the screen registry, in every language, both appearances and both
 * text sizes: the real screen over a drawn stand-in for the photo, since a capture has no camera.
 */
export function cameraState(input: CameraStateInput): ScreenState {
  function State() {
    return <Captured capture={input.capture} />;
  }
  const design: DesignReference | null =
    input.screen === null
      ? null
      : { board: CAMERA_BOARD, section: CAMERA_SECTION, screen: input.screen };
  return {
    id: input.id,
    design,
    ...(input.undesignedReason ? { undesignedReason: input.undesignedReason } : {}),
    component: State,
    variants: standardVariants(),
  };
}
