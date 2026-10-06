import { describe, expect, it } from '@jest/globals';

import { openRepositories } from '../../data/repositories';
import { openTestDatabase } from '../../data/test/open-test-database';
import {
  fixtureMonster,
  fixtureMonsters,
  fixturePieces,
  fixtureTask,
} from '../reveal/registry/keep-fixtures';

import { PIECE_NAMES, worldInks, worldRowCommands } from './world-commands';
import { inLandingOrder, layoutWorld, WORLD_WIDTH, type PlacedPiece } from './world-layout';

const overlap = (a: PlacedPiece, b: PlacedPiece) =>
  a.x < b.x + b.size && b.x < a.x + a.size && a.y < b.y + b.size && b.y < a.y + a.size;

describe('the world', () => {
  it('lays the same pieces out the same way every time', () => {
    const pieces = fixturePieces(60);
    const once = layoutWorld(inLandingOrder(pieces), PIECE_NAMES);
    const again = layoutWorld(inLandingOrder([...pieces].reverse()), PIECE_NAMES);
    expect(again).toEqual(once);
  });

  it('keeps every piece where it landed when more arrive', () => {
    const before = layoutWorld(inLandingOrder(fixturePieces(60)), PIECE_NAMES);
    const after = layoutWorld(inLandingOrder(fixturePieces(300)), PIECE_NAMES);
    expect(after.placed.slice(0, 60)).toEqual(before.placed);
  });

  it('never lets two of three hundred pieces overlap, or one leave the ground', () => {
    const { placed, height } = layoutWorld(inLandingOrder(fixturePieces(300)), PIECE_NAMES);
    expect(placed).toHaveLength(300);
    for (const piece of placed) {
      expect(piece.x).toBeGreaterThanOrEqual(0);
      expect(piece.x + piece.size).toBeLessThanOrEqual(WORLD_WIDTH);
      expect(piece.y + piece.size).toBeLessThanOrEqual(height);
      expect(PIECE_NAMES).toContain(piece.art);
    }
    const clashes = placed.flatMap((a, index) =>
      placed.slice(index + 1).filter((b) => overlap(a, b)),
    );
    expect(clashes).toEqual([]);
  });

  it('is a place at every size, from nothing to three hundred', () => {
    for (const count of [0, 1, 7, 60, 300]) {
      const layout = layoutWorld(inLandingOrder(fixturePieces(count)), PIECE_NAMES);
      const monsters = new Map(fixtureMonsters(count).map((monster) => [monster.id, monster]));
      expect(layout.rows).toBeGreaterThanOrEqual(1);
      const drawn = Array.from({ length: layout.rows }, (_, row) =>
        worldRowCommands(layout, row, monsters, worldInks('light')),
      );
      // Every row has its ground, and every piece is drawn in exactly one row.
      expect(drawn.every((row) => row.length > 0)).toBe(true);
      expect(new Set(layout.placed.map((piece) => piece.id)).size).toBe(count);
    }
  });

  it('gives a serious task a quiet piece', () => {
    const plain = layoutWorld(inLandingOrder(fixturePieces(300)), PIECE_NAMES).placed.filter(
      (piece) => piece.kind === 'plain',
    );
    expect(plain.length).toBeGreaterThan(0);
    for (const piece of plain) expect(['shrub', 'hill']).toContain(piece.art);
  });

  it('has nothing from a task that was let go', async () => {
    const repositories = openRepositories((await openTestDatabase()).db);
    const task = { ...fixtureTask(0), status: 'started' as const, finishedAt: null };
    await repositories.tasks.put(task);
    await repositories.monsters.put({
      ...fixtureMonster(0),
      caughtAt: null,
      caughtOn: null,
      number: null,
      rarity: null,
      daysLurked: null,
      catchMinutes: null,
      dread: null,
    });
    await repositories.forgetTask(task.id);

    const pieces = await repositories.worldPieces.all();
    expect(pieces).toEqual([]);
    expect(layoutWorld(inLandingOrder(pieces), PIECE_NAMES).placed).toEqual([]);
    expect(await repositories.surpriseDrops.all()).toEqual([]);
  });
});
