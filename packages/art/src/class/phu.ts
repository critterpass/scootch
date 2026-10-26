/**
 * Thầy Phú: 24 poses as data, built from the shared parts of the Phu board.
 *
 * The poses are in phu-moods.ts. `buildPhu` fills the board's template with a pose and cuts it
 * into layers; see `figure.ts`.
 *
 * Layers a renderer can move on their own, in drawing order:
 *   feet.left, feet.right   steps while he walks
 *   body                    breathes
 *   head                    puffs and tilts (the pose's own matrix), breathes a beat behind
 *     flush, hair.strand, brow.left, brow.right, eyes (blinks), mouth, mustache, glasses,
 *     fx.vein, fx.tear, fx.sweat
 *   arms
 *     arms.<pose>, and inside some of them: ruler + ruler.tap, tea.steam + cup, wave + wave.lines
 *   fx.steam, fx.sparkle, fx.exclaim, fx.zzz
 */
import { buildFigure, type Figure, type LayerRule } from './figure';
import { parseMarkup, type Element } from './markup';
import type { Arms, PhuEffect, PhuPose } from './phu-moods';
import { PHU_SIZE, PHU_TEMPLATE } from './phu-template';

export * from './phu-moods';
const PARTS = {
  glasses: ['Up', 'Down'],
  lens: ['Open', 'Angry', 'Squeeze', 'Happy', 'Glint', 'Surprise', 'Look', 'Side', 'Teary', 'Shut'],
  above: ['Flat', 'Angry', 'Down', 'Closed', 'Peer'],
  bare: ['Soft'],
  mouth: [
    'Calm',
    'Flat',
    'Pout',
    'Smile',
    'Shout',
    'O',
    'Laugh',
    'Wavy',
    'Side',
    'Frown',
    'Grit',
    'Tight',
  ],
  arms: [
    'Rest',
    'Tea',
    'Crossed',
    'Ruler',
    'Fists',
    'Grading',
    'Thumb',
    'Glasses',
    'Wave',
    'Point',
    'Think',
    'Palm',
    'Belly',
    'Clap',
    'Hips',
    'Watch',
    'Snap',
    'Slip',
    'Count',
  ],
} as const;
const PREFIX = {
  glasses: 'glasses',
  lens: 'in',
  above: 'above',
  bare: 'bare',
  mouth: 'mouth',
  arms: 'arms',
} as const;

/** The board's `renderVals()`: every hole of the template, for a pose. */
export function phuHoles(pose: PhuPose): Readonly<Record<string, string | number>> {
  const o: Record<string, number> = {};
  (Object.keys(PARTS) as (keyof typeof PARTS)[]).forEach((family) => {
    PARTS[family].forEach((part) => {
      o[`o.${PREFIX[family]}${part}`] = pose[family] === part ? 1 : 0;
    });
  });
  const fx = (e: PhuEffect) => (pose.effects.includes(e) ? 1 : 0);
  o['o.glare'] = ['Open', 'Angry', 'Look', 'Side'].includes(pose.lens ?? '') ? 1 : 0;
  Object.assign(o, {
    'o.blush': pose.blush,
    'o.red': pose.red,
    'o.vein': fx('vein'),
    'o.steam': fx('steam'),
    'o.sparkle': fx('sparkle'),
    'o.exclaim': fx('exclaim'),
    'o.zzz': fx('zzz'),
    'o.tear': fx('tear'),
    'o.sweat': fx('sweat'),
    'o.cheeks': fx('cheeks'),
  });
  const { left, right } = pose.brows;
  return {
    ...o,
    browL: `translate(72 ${left.y}) rotate(${left.angle})`,
    browR: `translate(128 ${right.y}) rotate(${-right.angle})`,
    headT: `translate(100 128) rotate(${pose.tilt}) scale(${pose.puff}) translate(-100 -128)`,
  };
}

const TEMPLATE = parseMarkup(PHU_TEMPLATE);

const hole = (element: Element, attr: string) =>
  element.attrs[attr]?.match(/^\{\{\s*([\w.]+)\s*\}\}$/)?.[1];

/** Moving pieces inside an arm pose, by their place in the board's group. */
const ARM_PIECES: Readonly<Partial<Record<Arms, readonly (LayerRule | undefined)[]>>> = {
  Ruler: [
    undefined,
    undefined,
    ...Array<LayerRule>(5).fill({ id: 'ruler', pivot: [158, 148], motion: 'rulerTap' }),
    { id: 'ruler.tap', pivot: [194, 186], motion: 'tapMark' },
  ],
  Tea: [
    undefined,
    undefined,
    { id: 'tea.steam', pivot: [62, 124], motion: 'teaSteam' },
    ...Array<LayerRule>(5).fill({ id: 'cup', pivot: [42, 148], motion: 'sip' }),
  ],
  Wave: [
    undefined,
    undefined,
    { id: 'wave', pivot: [158, 148], motion: 'wave' },
    { id: 'wave', pivot: [158, 148], motion: 'wave' },
    { id: 'wave.lines' },
  ],
};

const EFFECT_LAYERS: Readonly<Record<string, LayerRule>> = {
  'o.vein': { id: 'fx.vein', pivot: [154, 29], motion: 'vein' },
  'o.tear': { id: 'fx.tear', pivot: [62, 108] },
  'o.sweat': { id: 'fx.sweat', pivot: [155, 56] },
  'o.steam': { id: 'fx.steam', pivot: [100, 40], motion: 'puffSteam' },
  'o.sparkle': { id: 'fx.sparkle', pivot: [100, 45], motion: 'sparkle' },
  'o.exclaim': { id: 'fx.exclaim', pivot: [160, 40] },
  'o.zzz': { id: 'fx.zzz', pivot: [160, 40], motion: 'zzz' },
  'o.red': { id: 'flush' },
};

function phuLayer(
  element: Element,
  path: readonly number[],
  ancestors: readonly Element[],
): LayerRule | undefined {
  const cls = hole(element, 'class');
  if (cls === 'footL') return { id: 'feet.left', pivot: [79, 217], motion: 'step' };
  if (cls === 'footR') return { id: 'feet.right', pivot: [121, 217], motion: 'step' };
  const transform = hole(element, 'transform');
  if (transform === 'headT') return { id: 'head', pivot: [100, 128], motion: 'breatheHead' };
  if (transform === 'browL') return { id: 'brow.left', pivot: [0, 0] };
  if (transform === 'browR') return { id: 'brow.right', pivot: [0, 0] };
  const opacity = hole(element, 'opacity');
  if (opacity) {
    const effect = EFFECT_LAYERS[opacity];
    if (effect) return effect;
    if (/^o\.(above|bare|in)[A-Z]/.test(opacity)) return { id: 'eyes', pivot: [100, 84] };
    if (/^o\.glasses/.test(opacity)) return { id: 'glasses', pivot: [100, 84] };
    if (/^o\.mouth/.test(opacity)) return { id: 'mouth', pivot: [100, 125], motion: 'talk' };
    const arms = opacity.match(/^o\.arms(\w+)$/)?.[1];
    if (arms) return { id: `arms.${arms.toLowerCase()}` };
  }
  if (path.length === 1 && element.tag === 'g' && Object.keys(element.attrs).length === 0) {
    return { id: 'body', pivot: [100, 201], motion: 'breathe' };
  }
  if (path.length === 1 && element.tag === 'g' && element.attrs['stroke-linecap'] === 'round') {
    return { id: 'arms' };
  }
  const d = element.attrs.d ?? '';
  if (d.startsWith('M112 20 C110 6'))
    return { id: 'hair.strand', pivot: [115, 20], motion: 'strand' };
  if (d.startsWith('M100 104 C92 98') || d.startsWith('M68 110 C74 118')) {
    return { id: 'mustache', pivot: [100, 108], motion: 'talk' };
  }
  const parent = ancestors[ancestors.length - 1];
  const parentArms = parent && hole(parent, 'opacity')?.match(/^o\.arms(\w+)$/)?.[1];
  if (parentArms) return ARM_PIECES[parentArms as Arms]?.[path.at(-1) ?? -1];
  return undefined;
}

/** Thầy Phú in a pose, as layers in a 200 by 220 space with his feet at y = 217. */
export function buildPhu(pose: PhuPose): Figure {
  const holes = phuHoles(pose);
  return buildFigure(
    { name: 'phu', width: PHU_SIZE.width, height: PHU_SIZE.height, label: pose.label },
    TEMPLATE,
    { values: (h) => holes[h], layer: phuLayer },
  );
}
