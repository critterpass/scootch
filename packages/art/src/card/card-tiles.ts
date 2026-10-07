import type { CardData } from '@scootch/domain';

import type { DrawCommand } from '../core/commands';
import { baseline, fitText, textCommand, type MeasureText, type TextStyle } from '../core/text';
import { oneLine, pushLines } from './card-lines';
import type { CardFinishInks } from './finish';
import { splitMinutes, type CardLabels } from './labels';
import { fill, roundRect } from './shapes';

export const TILE_HEIGHT = 47;

const LABEL: TextStyle = { font: 'sans', size: 10, weight: 600, tracking: 0.05 };
const VALUE: TextStyle = { font: 'rounded', size: 15, weight: 700 };

export interface TilePlace {
  readonly left: number;
  readonly top: number;
  /** The width the three tiles share, with a gap of 6 between them. */
  readonly width: number;
  readonly wild: boolean;
}

/** Lurked, dread and catch time: the three stat tiles under the panel. */
export function buildTiles(
  data: CardData,
  labels: CardLabels,
  inks: CardFinishInks,
  measure: MeasureText,
  place: TilePlace,
): DrawCommand[] {
  const out: DrawCommand[] = [];
  const tileWidth = (place.width - 12) / 3;
  const [hours, minutes] = splitMinutes(data.catchMinutes);
  const tiles = [
    { label: labels.lurked, value: labels.days(data.daysLurked), color: inks.ink },
    { label: labels.dread, value: null, color: inks.ink },
    {
      label: labels.caughtIn,
      value: place.wild ? '—' : labels.duration(hours, minutes),
      color: inks.accent,
    },
  ];
  tiles.forEach((tile, i) => {
    const x = place.left + i * (tileWidth + 6);
    const inner = tileWidth - 18;
    out.push(fill(roundRect({ x, y: place.top, w: tileWidth, h: TILE_HEIGHT }, 10), inks.tile));
    pushLines(out, measure, tile.label.toUpperCase(), LABEL, oneLine(7, inner), {
      x: x + 9,
      top: place.top + 8,
      leading: 1,
      color: inks.muted,
    });
    if (tile.value !== null) {
      const value = fitText(tile.value, VALUE, oneLine(9, inner), measure);
      out.push(
        textCommand(value.lines[0] ?? '', value.style, {
          x: x + 9,
          y: baseline(place.top + 24, VALUE.size, VALUE.size),
          maxWidth: inner,
          color: tile.color,
        }),
      );
      return;
    }
    for (let pip = 0; pip < 5; pip++) {
      const on = pip < data.dread;
      out.push(
        fill(
          [['O', x + 13.5 + pip * 12, place.top + 28.5, 4.5]],
          on ? inks.accent : inks.ink,
          on ? 1 : 0.12,
        ),
      );
    }
  });
  return out;
}
