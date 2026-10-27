import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { clampCamera, type Camera } from '@phusclass/art/class';

import { shotFor } from '../../classroom/classroom';
import { useHandFont } from '../../classroom/use-hand-font';
import { useT } from '../../i18n/i18n-provider';

import { fitChalk, handMeasure } from './chalk-fit';
import type { ChalkModel } from './desk-model';
import { chalkWords } from './room-scene';
import { BUBBLE_RIGHT, BUBBLE_WIDTH } from './speech-bubble';

/** The chalkboard in the phone room, in room units. */
const CHALKBOARD = { x: 480, y: 100, width: 640, height: 196 } as const;
/** Where the chalk's column starts in the phone room, as `@phusclass/art` writes it. */
const CHALK_LEFT = 623;
/** Room kept between the end of the chalk and his bubble, in points. */
const CHALK_CLEAR = 10;

export interface DeskChalk {
  /** Where the chalkboard sits on screen at the desk shot: the board grows out of it. */
  readonly chalkboard: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  /** The chalk lines and the line under them, in the app's language. */
  readonly words: { readonly chalk: string[]; readonly more: string };
}

/** Where the room is seen on iPhone Duo: the fold's camera, and where his bubble's edge is. */
export interface DeskChalkPlace {
  readonly camera: Camera;
  /** The room's height on screen, below the status bar. */
  readonly roomHeight: number;
  /** The x his bubble keeps its distance from: the room's edge, short of the controls. */
  readonly rightEdge: number;
}

/**
 * The chalkboard on the desk: its frame on screen, and its lines cut to end before his bubble's
 * column, as on the Desk board. At recess the camera is further back and nothing is cut.
 */
export function useDeskChalk(
  chalk: ChalkModel,
  fitted: boolean,
  place: DeskChalkPlace | null = null,
): DeskChalk {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const hand = useHandFont();
  const measure = useMemo(() => handMeasure(hand), [hand]);

  const { chalkboard, chalkWidth } = useMemo(() => {
    const viewport = { width, height: place?.roomHeight ?? height - insets.top };
    const camera = place ? clampCamera(place.camera, viewport, 'phone') : shotFor('desk', viewport);
    const k = width / camera.w;
    // The chalk ends before his bubble's column, in room units.
    const bubbleLeft = (place?.rightEdge ?? width) - BUBBLE_RIGHT - BUBBLE_WIDTH;
    return {
      chalkboard: {
        x: (CHALKBOARD.x - camera.x) * k,
        y: insets.top + (CHALKBOARD.y - camera.y) * k,
        width: CHALKBOARD.width * k,
        height: CHALKBOARD.height * k,
      },
      chalkWidth: (bubbleLeft - CHALK_CLEAR) / k - (CHALK_LEFT - camera.x),
    };
  }, [
    width,
    height,
    insets.top,
    place?.camera.x,
    place?.camera.w,
    place?.roomHeight,
    place?.rightEdge,
  ]);

  const written = chalkWords(chalk, t);
  return {
    chalkboard,
    words: {
      ...written,
      chalk: fitted ? fitChalk(written.chalk, chalkWidth, measure) : written.chalk,
    },
  };
}
