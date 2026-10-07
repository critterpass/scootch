import {
  VIEW_SIZE,
  type DrawCommand,
  type GradientStop,
  type Paint,
  type Path,
} from '../core/commands';
import { strHash } from '../core/rng';

function pathData(path: Path): string {
  return path
    .map((segment) => {
      switch (segment[0]) {
        case 'M':
        case 'L':
          return `${segment[0]}${segment[1]} ${segment[2]}`;
        case 'Q':
          return `Q${segment[1]} ${segment[2]} ${segment[3]} ${segment[4]}`;
        case 'O': {
          const [, x, y, r] = segment;
          return `M${x + r} ${y}a${r} ${r} 0 1 0 ${-2 * r} 0a${r} ${r} 0 1 0 ${2 * r} 0Z`;
        }
        case 'Z':
          return 'Z';
      }
    })
    .join('');
}

/** Stands in for the id prefix until the whole drawing is known. */
const ID_SLOT = '\u0000';

const opacity = (name: string, alpha: number): string =>
  alpha === 1 ? '' : ` ${name}="${Math.round(alpha * 1000) / 1000}"`;

export interface SvgOptions {
  /**
   * Prefix of the clip ids. Ids are shared by a whole page, so two different drawings need
   * different prefixes; the default is derived from the drawing itself.
   */
  readonly idPrefix?: string;
  /** Width and height of the drawing space; a monster's 200 by 200 when left out. */
  readonly width?: number;
  readonly height?: number;
}

const SVG_FONT_FAMILIES = {
  rounded: "ui-rounded, 'SF Pro Rounded', 'Nunito', system-ui, sans-serif",
  sans: "-apple-system, 'SF Pro Text', 'Helvetica Neue', system-ui, sans-serif",
} as const;
const ANCHORS = { left: 'start', center: 'middle', right: 'end' } as const;

const escapeText = (text: string): string =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

const stopsOf = (stops: readonly GradientStop[]): string =>
  stops
    .map(
      ([offset, color, alpha]) =>
        `<stop offset="${offset}" stop-color="${color}"${opacity('stop-opacity', alpha)}/>`,
    )
    .join('');

/** A paint as the `<defs>` entry a path refers to by `id`. */
function paintDef(paint: Paint, id: string): string {
  if (paint.kind === 'linear') {
    return (
      `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${paint.from[0]}"` +
      ` y1="${paint.from[1]}" x2="${paint.to[0]}" y2="${paint.to[1]}">` +
      `${stopsOf(paint.stops)}</linearGradient>`
    );
  }
  if (paint.kind === 'radial') {
    return (
      `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${paint.centre[0]}"` +
      ` cy="${paint.centre[1]}" r="${paint.radius}">${stopsOf(paint.stops)}</radialGradient>`
    );
  }
  // Grain: grey noise whose specks are about `size` units across.
  const frequency = Math.round((1 / paint.size) * 1000) / 1000;
  return (
    `<filter id="${id}" x="0" y="0" width="100%" height="100%">` +
    `<feTurbulence type="fractalNoise" baseFrequency="${frequency}" numOctaves="3" stitchTiles="stitch"/>` +
    '<feColorMatrix type="saturate" values="0"/>' +
    '<feComposite in2="SourceGraphic" operator="in"/></filter>'
  );
}

/** Turns drawing commands into a standalone SVG document whose view box is the drawing space. */
export function toSvg(commands: readonly DrawCommand[], options: SvgOptions = {}): string {
  const clips: string[] = [];
  const paints: Paint[] = [];
  const body: string[] = [];
  /** How many groups each open save has opened. */
  const open: number[] = [0];
  const group = (attribute: string): void => {
    body.push(`<g ${attribute}>`);
    open[open.length - 1] = (open[open.length - 1] ?? 0) + 1;
  };
  const close = (): void => {
    body.push('</g>'.repeat(open.pop() ?? 0));
  };

  for (const command of commands) {
    switch (command.op) {
      case 'save':
        open.push(0);
        break;
      case 'restore':
        close();
        break;
      case 'transform':
        group(`transform="matrix(${command.matrix.join(' ')})"`);
        break;
      case 'clip':
        clips.push(pathData(command.path));
        group(`clip-path="url(#${ID_SLOT}${clips.length - 1})"`);
        break;
      case 'fill':
        body.push(
          `<path d="${pathData(command.path)}" fill="${command.color}"` +
            opacity('fill-opacity', command.alpha) +
            (command.rule === 'evenodd' ? ' fill-rule="evenodd"' : '') +
            '/>',
        );
        break;
      case 'paint': {
        paints.push(command.paint);
        const id = `${ID_SLOT}p${paints.length - 1}`;
        const blend = command.blend === 'normal' ? '' : ` style="mix-blend-mode:${command.blend}"`;
        body.push(
          command.paint.kind === 'grain'
            ? `<path d="${pathData(command.path)}" filter="url(#${id})"` +
                opacity('opacity', command.alpha) +
                `${blend}/>`
            : `<path d="${pathData(command.path)}" fill="url(#${id})"` +
                opacity('fill-opacity', command.alpha) +
                `${blend}/>`,
        );
        break;
      }
      case 'stroke':
        body.push(
          `<path d="${pathData(command.path)}" fill="none" stroke="${command.color}"` +
            ` stroke-width="${command.width}" stroke-linecap="round" stroke-linejoin="round"` +
            opacity('stroke-opacity', command.alpha) +
            '/>',
        );
        break;
      case 'text':
        body.push(
          `<text x="${command.x}" y="${command.y}" font-family="${SVG_FONT_FAMILIES[command.font]}"` +
            ` font-size="${command.size}" font-weight="${command.weight}"` +
            (command.italic ? ' font-style="italic"' : '') +
            ` text-anchor="${ANCHORS[command.align]}"` +
            (command.letterSpacing === 0 ? '' : ` letter-spacing="${command.letterSpacing}"`) +
            ` fill="${command.color}"` +
            opacity('fill-opacity', command.alpha) +
            `>${escapeText(command.text)}</text>`,
        );
        break;
    }
  }
  while (open.length > 0) close();

  const drawing = body.join('');
  const prefix = options.idPrefix ?? `m${strHash(drawing).toString(36)}-`;
  const defined = [
    ...clips.map((d, i) => `<clipPath id="${prefix}${i}"><path d="${d}"/></clipPath>`),
    ...paints.map((paint, i) => paintDef(paint, `${prefix}p${i}`)),
  ];
  const defs = defined.length ? `<defs>${defined.join('')}</defs>` : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${options.width ?? VIEW_SIZE} ${options.height ?? VIEW_SIZE}">` +
    defs +
    drawing.replaceAll(ID_SLOT, prefix) +
    '</svg>'
  );
}
