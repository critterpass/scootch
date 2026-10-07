import { buildMonster, GROUND_Y, VIEW_SIZE, type DrawCommand, type Path } from '@scootch/art';
import type { Id, MonsterRow } from '@scootch/domain';

import { LANDMARK_BOX, SCOOTCH_AT, type IslandItem, type IslandLayout } from './island-layout';
import { LANDMARK_ART } from './landmarks';
import { fill, PIECE_BOX, PIECE_GROUND, polygon, stroke, type WorldInks } from './piece-kit';

/**
 * The island's own inks. The board prints the island on the same sand whatever is around it, so
 * the sand does not change with the phone's appearance: on a dark page it is a lit island, not a
 * grey slab.
 */
export const ISLAND_INKS = {
  sand: '#E5DCCD',
  sandEdge: '#D2C6B3',
  ink: '#1C1A17',
  tomato: '#F0562E',
  rock: '#B8AC97',
  rockShade: '#A89C87',
  wall: '#3A3430',
  window: '#F6D9A8',
} as const;

const LANDMARK_INKS: WorldInks = {
  ground: ISLAND_INKS.sand,
  groundEdge: ISLAND_INKS.sandEdge,
  ink: ISLAND_INKS.ink,
  tomato: ISLAND_INKS.tomato,
  moss: '#4F6B4A',
  clay: '#C2603F',
  paper: '#FBF8F2',
};

const circle = (x: number, y: number, r: number): Path => [['O', x, y, r]];

/** An ellipse, as a unit circle stretched into place. */
function ellipse(x: number, y: number, rx: number, ry: number, color: string): DrawCommand[] {
  return [
    { op: 'save' },
    { op: 'transform', matrix: [rx, 0, 0, ry, x, y] },
    fill(circle(0, 0, 1), color),
    { op: 'restore' },
  ];
}

/** The sand, with its darker rim showing along the near edge. */
export function groundCommands(layout: IslandLayout): DrawCommand[] {
  const { x, y, rx, ry } = layout.ground;
  return [
    ...ellipse(x, y, rx, ry, ISLAND_INKS.sandEdge),
    { op: 'save' },
    { op: 'transform', matrix: [rx, 0, 0, ry, x, y] },
    { op: 'clip', path: circle(0, 0, 1) },
    { op: 'transform', matrix: [1 / rx, 0, 0, 1 / ry, -x / rx, -y / ry] },
    ...ellipse(x - 3, y - 4.5, rx, ry, ISLAND_INKS.sand),
    { op: 'restore' },
  ];
}

/**
 * A monster as it lives in the world. This is the one place the world asks the art package for a
 * resident: when the package can draw a monster asleep, the mood is passed here and every
 * resident sleeps.
 */
function resident(monster: MonsterRow): DrawCommand[] {
  return buildMonster(monster.spec);
}

/** A pole with a small tomato flag. */
function flag(unit: number): DrawCommand[] {
  return [
    stroke(
      [
        ['M', 0, 0],
        ['L', 0, -26 * unit],
      ],
      ISLAND_INKS.ink,
      1.6,
    ),
    fill(
      polygon([
        [0, -26 * unit],
        [12 * unit, -21 * unit],
        [0, -16 * unit],
      ]),
      ISLAND_INKS.tomato,
    ),
  ];
}

/** Two stones, one in front of the other. */
function rocks(unit: number): DrawCommand[] {
  return [
    ...ellipse(0, -9 * unit, 10 * unit, 9 * unit, ISLAND_INKS.rock),
    ...ellipse(-7 * unit, -4 * unit, 7 * unit, 6 * unit, ISLAND_INKS.rockShade),
  ];
}

/** A dark little house with a tomato roof and one lit window. */
function house(unit: number): DrawCommand[] {
  return [
    fill(
      polygon([
        [-9 * unit, 0],
        [9 * unit, 0],
        [9 * unit, -12 * unit],
        [-9 * unit, -12 * unit],
      ]),
      ISLAND_INKS.wall,
    ),
    fill(
      polygon([
        [-12 * unit, -11 * unit],
        [12 * unit, -11 * unit],
        [0, -22 * unit],
      ]),
      ISLAND_INKS.tomato,
    ),
    fill(circle(0, -5 * unit, 2.2 * unit), ISLAND_INKS.window),
  ];
}

const SCENERY = { flag, rocks, house } as const;
/** Scenery is drawn this much larger than the stage's scale, as the board draws it. */
const SCENERY_UNIT = 2.4;

function at(x: number, y: number, scale: number, commands: readonly DrawCommand[]): DrawCommand[] {
  return [
    { op: 'save' },
    { op: 'transform', matrix: [scale, 0, 0, scale, x, y] },
    ...commands,
    { op: 'restore' },
  ];
}

/** One thing on the island, drawn where it stands. */
export function itemCommands(
  item: IslandItem,
  monsters: ReadonlyMap<Id, MonsterRow>,
): DrawCommand[] {
  if (item.kind === 'landmark') {
    const art = item.art ? LANDMARK_ART[item.art] : undefined;
    if (!art) return [];
    const scale = (LANDMARK_BOX * item.scale) / PIECE_BOX;
    return at(
      item.x - (PIECE_BOX / 2) * scale,
      item.y - PIECE_GROUND * scale,
      scale,
      art(() => 0.5, LANDMARK_INKS),
    );
  }
  if (item.kind === 'monster') {
    const monster = item.monsterId ? monsters.get(item.monsterId) : undefined;
    // A resident whose row is gone leaves its stones behind.
    if (!monster) return at(item.x, item.y, 1, rocks(item.scale * SCENERY_UNIT));
    return at(
      item.x - (VIEW_SIZE / 2) * item.scale,
      item.y - GROUND_Y * item.scale,
      item.scale,
      resident(monster),
    );
  }
  return at(item.x, item.y, 1, SCENERY[item.kind](item.scale * SCENERY_UNIT));
}

export interface IslandDrawing {
  /** The sand and everything standing behind Scootch. */
  readonly behind: DrawCommand[];
  /** Everything standing in front of him. */
  readonly inFront: DrawCommand[];
}

/**
 * The whole island as two drawings, with Scootch's place between them. Both are built once for a
 * list of pieces and never again until that list changes.
 */
export function islandCommands(
  layout: IslandLayout,
  monsters: ReadonlyMap<Id, MonsterRow>,
  /** A piece that is drawn by itself for now, because it is landing. */
  except: Id | null = null,
): IslandDrawing {
  const behind = groundCommands(layout);
  const inFront: DrawCommand[] = [];
  for (const item of layout.items) {
    if (item.id === except) continue;
    (item.y > SCOOTCH_AT.y ? inFront : behind).push(...itemCommands(item, monsters));
  }
  return { behind, inFront };
}
