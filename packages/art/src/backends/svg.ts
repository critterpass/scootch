import { VIEW_SIZE, type DrawCommand, type Path } from '../core/commands';
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
}

/** Turns drawing commands into a standalone SVG document with a 200 by 200 view box. */
export function toSvg(commands: readonly DrawCommand[], options: SvgOptions = {}): string {
  const clips: string[] = [];
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
      case 'stroke':
        body.push(
          `<path d="${pathData(command.path)}" fill="none" stroke="${command.color}"` +
            ` stroke-width="${command.width}" stroke-linecap="round" stroke-linejoin="round"` +
            opacity('stroke-opacity', command.alpha) +
            '/>',
        );
        break;
    }
  }
  while (open.length > 0) close();

  const drawing = body.join('');
  const prefix = options.idPrefix ?? `m${strHash(drawing).toString(36)}-`;
  const defs = clips.length
    ? `<defs>${clips.map((d, i) => `<clipPath id="${prefix}${i}"><path d="${d}"/></clipPath>`).join('')}</defs>`
    : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW_SIZE} ${VIEW_SIZE}">` +
    defs +
    drawing.replaceAll(ID_SLOT, prefix) +
    '</svg>'
  );
}
