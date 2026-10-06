import { describe, expect, it } from '@jest/globals';

import { openRepositories } from '../../data/repositories';
import { openTestDatabase } from '../../data/test/open-test-database';
import {
  fixtureMonster,
  fixtureMonsters,
  fixturePieces,
  fixtureTask,
} from '../reveal/registry/keep-fixtures';

import { landLighthouse, lighthousePiece, pieceKind } from './landmarks';
import { PIECE_NAMES, headlandCommands, worldInks, worldRowCommands } from './world-commands';
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

describe('the lifetime lighthouse', () => {
  const lighthouse = lighthousePiece('2026-01-07');
  const inks = worldInks('light');
  const rowsOf = (layout: ReturnType<typeof layoutWorld>) =>
    Array.from({ length: layout.rows }, (_, row) => worldRowCommands(layout, row, new Map(), inks));

  it('lays ordinary pieces out exactly as the world always has', () => {
    // Read off the layout before landmarks existed: the same sixty pieces, to the last decimal.
    const { placed, rows, height } = layoutWorld(inLandingOrder(fixturePieces(60)), PIECE_NAMES);
    const sum = placed.reduce((total, piece) => total + piece.x + piece.y + piece.size, 0);
    expect({ rows, height, sum: sum.toFixed(6) }).toEqual({
      rows: 14,
      height: 1092,
      sum: '41856.229927',
    });
    expect(placed.map((piece) => piece.art[0]).join('')).toBe(
      'hhhhfhssshhhhsfsssfhsshfhhhhsfhhsssshhhhfhhhfsssshhshsfhhshs',
    );
    expect(placed[0]).toMatchObject({
      art: 'hill',
      row: 0,
      x: 145.13060127530863,
      y: 10.260733889791563,
      size: 56.587916949763894,
    });
  });

  it('moves no piece and changes no drawing when it lands, whenever it lands', () => {
    for (const count of [0, 1, 7, 60, 300]) {
      const pieces = fixturePieces(count);
      const before = layoutWorld(inLandingOrder(pieces), PIECE_NAMES);
      for (const addedOn of ['2020-01-01', '2026-01-07', '2099-01-01']) {
        const after = layoutWorld(
          inLandingOrder([{ ...lighthouse, addedOn }, ...pieces]),
          PIECE_NAMES,
        );
        expect(after.placed).toEqual(before.placed);
        expect([after.rows, after.height]).toEqual([before.rows, before.height]);
        expect(rowsOf(after)).toEqual(rowsOf(before));
        expect(before.landmarks).toEqual([]);
        expect(headlandCommands(before, inks)).toEqual([]);
        // The same prominent spot every time: the middle of the headland, whatever else is there.
        expect(after.landmarks).toEqual([
          { id: lighthouse.id, art: 'lighthouse', x: 138, y: 12, size: 84 },
        ]);
        expect(headlandCommands(after, inks).length).toBeGreaterThan(1);
      }
    }
  });

  it('is a kind of its own, and never a drawing an ordinary piece can be dealt', () => {
    expect(pieceKind(lighthouse)).toBe('landmark');
    expect(fixturePieces(60).map(pieceKind)).toEqual(fixturePieces(60).map((piece) => piece.kind));
    expect(PIECE_NAMES).not.toContain('lighthouse');
    const dealt = layoutWorld(inLandingOrder(fixturePieces(300)), PIECE_NAMES).placed;
    expect(dealt.map((piece) => piece.art)).not.toContain('lighthouse');
  });

  it('lands once, in the row the phone already stores, and stays through a relaunch', async () => {
    const repositories = openRepositories((await openTestDatabase()).db);
    expect(await landLighthouse(repositories.worldPieces, '2026-01-07')).toBe(true);
    expect(await landLighthouse(repositories.worldPieces, '2026-03-01')).toBe(false);
    expect(await repositories.worldPieces.all()).toEqual([lighthouse]);
  });
});
