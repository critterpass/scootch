import { describe, expect, it } from '@jest/globals';

import { fixtureMonsters, fixturePieces } from '../reveal/registry/keep-fixtures';

import { islandCommands } from './island-commands';
import {
  hitIsland,
  ISLAND_SPACE,
  islandScale,
  layoutIsland,
  SCOOTCH_AT,
  tapSpots,
} from './island-layout';
import { lighthousePiece } from './landmarks';
import { inLandingOrder } from './world-layout';

const island = (count: number) => layoutIsland(inLandingOrder(fixturePieces(count)));
/** Half of a 44 point hit area on a 360 point island, in island units. */
const REACH = (22 / 360) * ISLAND_SPACE;

describe('the island', () => {
  it('rescales in four stages as it fills, and widens until it holds forty things', () => {
    expect([0, 1, 2, 8, 9, 24, 25, 60, 300].map(islandScale)).toEqual([
      0.34, 0.34, 0.24, 0.24, 0.17, 0.17, 0.13, 0.13, 0.13,
    ]);
    expect(island(0).ground).toEqual({ x: 100, y: 158, rx: 80, ry: 29 });
    expect(island(7).ground.rx).toBeCloseTo(85.6);
    expect(island(60).ground).toEqual(island(300).ground);
    expect(island(60).ground).toEqual({ x: 100, y: 158, rx: 96, ry: 36 });
  });

  it('lays the same pieces out the same way every time, whatever order they are read in', () => {
    const pieces = fixturePieces(60);
    expect(layoutIsland(inLandingOrder([...pieces].reverse()))).toEqual(
      layoutIsland(inLandingOrder(pieces)),
    );
    // Pinned: the first resident of a week-old island, to the last decimal.
    const first = island(7).items.find((item) => item.id === 'fixture-piece-0000');
    expect(first).toEqual({
      id: 'fixture-piece-0000',
      kind: 'monster',
      monsterId: 'fixture-monster-0',
      seed: 'fixture-0',
      art: null,
      x: 65.21634830139092,
      y: 139.08774108199574,
      scale: 0.24,
    });
  });

  it('keeps everything on the sand and off Scootch, at every stage', () => {
    for (const count of [1, 7, 60, 300]) {
      const { items, ground } = island(count);
      const clear = count <= 8 ? 40 : 26;
      for (const item of items) {
        const dx = (item.x - ground.x) / (ground.rx + clear);
        const dy = (item.y - ground.y) / ground.ry;
        expect(dx * dx + dy * dy).toBeLessThanOrEqual(1);
        const onScootch =
          Math.abs(item.x - SCOOTCH_AT.x) < clear - 0.001 && Math.abs(item.y - 158) < 12;
        expect(onScootch).toBe(false);
      }
    }
  });

  it('stands the first resident beside Scootch, and gives every monster a place', () => {
    expect(island(1).items).toEqual([
      expect.objectContaining({ kind: 'monster', x: 146, y: 154, scale: 0.34 }),
    ]);
    for (const count of [7, 60, 300]) {
      const monsters = fixturePieces(count).filter((piece) => piece.kind === 'monster');
      const placed = island(count).items.filter((item) => item.kind === 'monster');
      expect(placed.map((item) => item.monsterId).sort()).toEqual(
        monsters.map((piece) => piece.monsterId).sort(),
      );
    }
  });

  it('gives a quiet piece a rock or a flag and never a resident', () => {
    const quiet = fixturePieces(60).filter((piece) => piece.kind === 'plain');
    const items = island(60).items;
    for (const piece of quiet) {
      expect(['rocks', 'flag']).toContain(items.find((item) => item.id === piece.id)?.kind);
    }
  });

  it('moves nothing when the lighthouse lands, and stands it at the back', () => {
    const pieces = fixturePieces(7);
    const withLight = layoutIsland(inLandingOrder([...pieces, lighthousePiece('2026-10-05')]));
    const light = withLight.items.find((item) => item.kind === 'landmark');
    expect(withLight.items.filter((item) => item.kind !== 'landmark')).toEqual(island(7).items);
    expect(light).toMatchObject({ art: 'lighthouse' });
    expect(light?.y).toBeLessThan(SCOOTCH_AT.y);
  });

  it('draws every resident once, split around Scootch', () => {
    const monsters = new Map(fixtureMonsters(60).map((monster) => [monster.id, monster]));
    const whole = islandCommands(island(60), monsters);
    const without = islandCommands(island(60), monsters, 'fixture-piece-0000');
    const size = (drawing: typeof whole) => drawing.behind.length + drawing.inFront.length;
    expect(whole.inFront.length).toBeGreaterThan(0);
    expect(size(without)).toBeLessThan(size(whole));
  });
});

describe('a tap on the island', () => {
  it('lands on the monster that stands there', () => {
    const layout = island(7);
    const spots = tapSpots(layout, REACH);
    for (const spot of spots) {
      const hit = hitIsland(spots, spot.x, spot.y);
      expect(hit?.target).toEqual(spot.target);
    }
    expect(spots.filter((spot) => spot.target.kind === 'monster')).toHaveLength(6);
  });

  it('gives every resident a hit area of at least 44 points, however small it is drawn', () => {
    for (const spot of tapSpots(island(300), REACH)) {
      expect(spot.reach).toBeGreaterThanOrEqual(REACH);
    }
  });

  it('picks the nearest monster on a crowded island', () => {
    const spots = tapSpots(island(60), REACH);
    const monsters = spots.filter((spot) => spot.target.kind === 'monster');
    for (const spot of monsters) {
      // A finger a little off a resident still finds it, unless a neighbour is nearer.
      const x = spot.x + 1.5;
      const y = spot.y - 1;
      const hit = hitIsland(spots, x, y);
      const nearest = [...spots].sort(
        (a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y),
      )[0];
      expect(hit?.target).toEqual(nearest?.target);
    }
  });

  it('lands on nothing in the sky or the sea, and on no flag, rock or house', () => {
    const spots = tapSpots(island(7), REACH);
    expect(hitIsland(spots, 10, 10)).toBeNull();
    expect(hitIsland(spots, 190, 60)).toBeNull();
    expect(hitIsland(spots, 100, 199)).toBeNull();
    expect(spots.map((spot) => spot.target.kind).sort()).toEqual([
      ...Array.from({ length: 6 }, () => 'monster'),
      'scootch',
    ]);
  });

  it('finds Scootch in the middle and the lighthouse where it stands', () => {
    const layout = layoutIsland(
      inLandingOrder([...fixturePieces(7), lighthousePiece('2026-10-05')]),
    );
    const spots = tapSpots(layout, REACH);
    expect(hitIsland(spots, SCOOTCH_AT.x, SCOOTCH_AT.y - 12)?.target.kind).toBe('scootch');
    const light = spots.find((spot) => spot.target.kind === 'landmark');
    expect(light && hitIsland(spots, light.x, light.y)?.target.kind).toBe('landmark');
  });
});
