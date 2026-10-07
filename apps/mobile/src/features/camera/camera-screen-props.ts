import type { ReactNode } from 'react';

import type { Attitude, CameraAccess, CameraMode } from '@scootch/domain';

import type { CameraRead } from './camera-read';

/** What the camera is showing. `read` holds whatever came of the last photo. */
export type CameraShown =
  /** The camera has not been allowed yet; `canAsk` is false once the system will not ask again. */
  | { readonly kind: 'permission'; readonly canAsk: boolean }
  | { readonly kind: 'looking' }
  | { readonly kind: 'reading' }
  | { readonly kind: 'read'; readonly read: CameraRead };

export interface CameraScreenProps {
  readonly mode: CameraMode;
  readonly access: Readonly<Record<CameraMode, CameraAccess>>;
  readonly shown: CameraShown;
  readonly attitude: Attitude;
  /** The live viewfinder or the photo just taken, drawn edge to edge behind everything. */
  readonly picture: ReactNode;
  /**
   * What Scootch says about a heavy page, from the offline pack's plain words. Never a literal:
   * the words are not this screen's to write.
   */
  readonly plainLine: string;
  /** What Scootch says in the viewfinder before the first photo, from the offline pack. */
  readonly openingLine: string;
  /** The longer explanation of the hard word is open. */
  readonly moreShown: boolean;
  readonly copied: boolean;
  readonly onMode: (mode: CameraMode) => void;
  readonly onClose: () => void;
  readonly onShutter: () => void;
  readonly onRetake: () => void;
  /** The main button: the step's words become today's one thing. */
  readonly onStep: (task: string) => void;
  readonly onBigger: () => void;
  readonly onAllow: () => void;
  readonly onSettings: () => void;
  readonly onMore: () => void;
  readonly onCopy: (line: string) => void;
  readonly onHelplines: () => void;
}
