import type { ComponentType } from 'react';

import type { CatchKind } from '../catch-kinds';
import type { SceneProps } from '../rig';

import { BubbleScene } from './bubble-scene';
import { EnvelopeScene } from './envelope-scene';
import { JarScene } from './jar-scene';
import { LassoScene } from './lasso-scene';
import { NetScene } from './net-scene';
import { ReelScene } from './reel-scene';
import { StickerScene } from './sticker-scene';
import { VacuumScene } from './vacuum-scene';

/** The drawing for each catch. */
export const SCENES: Readonly<Record<CatchKind, ComponentType<SceneProps>>> = {
  jar: JarScene,
  reel: ReelScene,
  lasso: LassoScene,
  sticker: StickerScene,
  bubble: BubbleScene,
  net: NetScene,
  vacuum: VacuumScene,
  envelope: EnvelopeScene,
};
