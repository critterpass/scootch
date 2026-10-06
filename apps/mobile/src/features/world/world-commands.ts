import { buildMonster, VIEW_SIZE, type DrawCommand } from '@scootch/art';
import type { Id, MonsterRow } from '@scootch/domain';
import type { ColorScheme } from '@scootch/tokens';

import { fill, PIECE_BOX, placedIn, seedRoll, type PieceArt, type WorldInks } from './piece-kit';
import * as pieces from './pieces/index.generated';
import { LANDMARK_ART } from './landmarks';
import {
  HEADLAND_HEIGHT,
  ROW_HEIGHT,
  WORLD_WIDTH,
  type PlacedPiece,
  type WorldLayout,
} from './world-layout';

/** Every piece drawing, one file each in the pieces folder. */
export const PIECE_ART: Readonly<Record<string, PieceArt>> = pieces;
export const PIECE_NAMES = Object.keys(PIECE_ART);

export function worldInks(scheme: ColorScheme): WorldInks {
  return scheme === 'dark'
    ? {
        ground: '#3A342E',
        groundEdge: '#4A433D',
        ink: '#F6F3EE',
        tomato: '#F0562E',
        moss: '#6F8F68',
        clay: '#C2603F',
        paper: '#E9E2D6',
      }
    : {
        ground: '#E4DACA',
        groundEdge: '#D3C8B5',
        ink: '#1C1A17',
        tomato: '#F0562E',
        moss: '#4F6B4A',
        clay: '#C2603F',
        paper: '#FBF8F2',
      };
}

const EDGE = 8;
const CORNER = 34;

/** The ground of one row: a band of sand, rounded where the world begins and where it ends. */
function ground(first: boolean, last: boolean, inks: WorldInks): DrawCommand {
  const left = EDGE;
  const right = WORLD_WIDTH - EDGE;
  const top = first ? CORNER : 0;
  const bottom = last ? CORNER : 0;
  return fill(
    [
      ['M', left, top],
      ['Q', left, 0, left + top, 0],
      ['L', right - top, 0],
      ['Q', right, 0, right, top],
      ['L', right, ROW_HEIGHT - bottom],
      ['Q', right, ROW_HEIGHT, right - bottom, ROW_HEIGHT],
      ['L', left + bottom, ROW_HEIGHT],
      ['Q', left, ROW_HEIGHT, left, ROW_HEIGHT - bottom],
      ['Z'],
    ],
    inks.ground,
  );
}

/** One piece: its drawing, with the monster that lives there standing in front of it. */
function pieceCommands(
  piece: PlacedPiece,
  top: number,
  monsters: ReadonlyMap<Id, MonsterRow>,
  inks: WorldInks,
): DrawCommand[] {
  const art = PIECE_ART[piece.art];
  const monster = piece.monsterId ? monsters.get(piece.monsterId) : undefined;
  const y = piece.y - top;
  const prop = art ? art(seedRoll(piece.seed), inks) : [];
  if (!monster) return placedIn(prop, piece.x, y, piece.size, PIECE_BOX);
  return [
    ...placedIn(prop, piece.x, y + piece.size * 0.36, piece.size * 0.64, PIECE_BOX),
    ...placedIn(
      buildMonster(monster.spec),
      piece.x + piece.size * 0.26,
      y + piece.size * 0.26,
      piece.size * 0.74,
      VIEW_SIZE,
    ),
  ];
}

/**
 * The drawing of one row of the world, in a space `WORLD_WIDTH` wide and `ROW_HEIGHT` tall. The
 * world is drawn a row at a time so that a long one scrolls without drawing what is off screen.
 */
export function worldRowCommands(
  layout: WorldLayout,
  row: number,
  monsters: ReadonlyMap<Id, MonsterRow>,
  inks: WorldInks,
): DrawCommand[] {
  return [
    ground(row === 0, row === layout.rows - 1, inks),
    ...layout.placed
      .filter((piece) => piece.row === row)
      .flatMap((piece) => pieceCommands(piece, row * ROW_HEIGHT, monsters, inks)),
  ];
}

const NO_ROLL = () => 0.5;

/**
 * The headland above the first row, where landmarks stand: a low rise of the same sand, and each
 * landmark with its foot on it. A world with no landmark has no headland and draws nothing here.
 */
export function headlandCommands(layout: WorldLayout, inks: WorldInks): DrawCommand[] {
  if (layout.landmarks.length === 0) return [];
  const left = WORLD_WIDTH * 0.2;
  const right = WORLD_WIDTH * 0.8;
  const top = HEADLAND_HEIGHT - 22;
  const rise = fill(
    [
      ['M', left, HEADLAND_HEIGHT],
      ['Q', left, top, left + CORNER, top],
      ['L', right - CORNER, top],
      ['Q', right, top, right, HEADLAND_HEIGHT],
      ['Z'],
    ],
    inks.ground,
  );
  return [
    rise,
    ...layout.landmarks.flatMap((mark) => {
      const art = LANDMARK_ART[mark.art];
      return art ? placedIn(art(NO_ROLL, inks), mark.x, mark.y, mark.size, PIECE_BOX) : [];
    }),
  ];
}
