/**
 * The 19 classroom props, by name. Each is its board drawing in its own units; the parts the
 * board animates (the cat's legs, tail and head, a flame, a glow, the drip, the wings, the steam)
 * are layers named after the board's class, numbered when there are several, turning about the
 * same point the board's CSS turns them about.
 */
import { boxPoint, fillBox } from './bounds';
import { buildFigure, type Figure, type LayerRule } from './figure';
import { parseMarkup, type Element } from './markup';
import { PROP_TEMPLATES } from './prop-templates';

export type PropName = keyof typeof PROP_TEMPLATES;
export const PROP_NAMES = Object.keys(PROP_TEMPLATES) as readonly PropName[];

export const isPropName = (value: string): value is PropName => value in PROP_TEMPLATES;

/** Each moving class and its `transform-origin`, as fractions of the part's box. */
const ORIGINS: Readonly<Record<string, readonly [number, number]>> = {
  legA: [0.5, 0.08],
  legB: [0.5, 0.08],
  tail: [0.95, 0.95],
  head: [0.3, 0.9],
  flame: [0.5, 1],
  glow: [0.5, 0.5],
  drip: [0.5, 0.5],
  wingL: [1, 0.6],
  wingR: [0, 0.6],
  steam: [0.5, 1],
};

const parsed = new Map<PropName, ReturnType<typeof parseMarkup>>();
const built = new Map<PropName, Figure>();

/** A prop as layers, in its board units (`width` by `height`). */
export function buildProp(name: PropName): Figure {
  const cached = built.get(name);
  if (cached) return cached;
  const template = PROP_TEMPLATES[name];
  const nodes = parsed.get(name) ?? parseMarkup(template.markup);
  parsed.set(name, nodes);
  const seen = new Map<string, number>();
  const layer = (element: Element): LayerRule | undefined => {
    const motion = element.attrs.class?.match(/^pa-(\w+)$/)?.[1];
    if (!motion) return undefined;
    const origin = ORIGINS[motion];
    if (!origin) throw new Error(`No origin for pa-${motion}`);
    const count = (seen.get(motion) ?? 0) + 1;
    seen.set(motion, count);
    return {
      id: `${motion}.${count}`,
      motion,
      pivot: boxPoint(fillBox(element), origin[0], origin[1]),
    };
  };
  const figure = buildFigure(
    { name, width: template.width, height: template.height, label: template.label },
    nodes,
    { layer },
  );
  built.set(name, figure);
  return figure;
}
