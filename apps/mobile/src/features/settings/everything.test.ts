import { describe, expect, it } from '@jest/globals';

import { momentAt } from '@phusclass/domain/board';

import { openMigratedDatabase } from '../../data/test-database';
import { writeSetting } from '../../data/settings-repository';
import { createBoardStore } from '../../state/board-store';

import { exportEverything, PERSON_TABLES, wipePhone } from './everything';

async function usedBoard() {
  const db = await openMigratedDatabase();
  const at = Date.parse('2026-10-27T09:00:00Z');
  let id = 0;
  const store = createBoardStore({
    db,
    clock: () => momentAt(at, 'UTC', 4),
    newId: () => `task-${(id += 1)}`,
  });
  await store.load();
  await store.say('email the landlord and buy milk');
  await store.start();
  await store.finish();
  await writeSetting(db, 'student.fullName', 'Trần Minh Anh');
  return { db, store, at };
}

describe('export and delete everything', () => {
  it('covers every table the phone keeps, so nothing is left out of either', async () => {
    const db = await openMigratedDatabase();
    const tables = db.column(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name != '_migrations'",
    );
    expect([...tables].sort()).toEqual([...PERSON_TABLES].sort());
  });

  it('exports what was said, done and set', async () => {
    const { db, at } = await usedBoard();
    const file = await exportEverything(db, at);
    expect(file.exportedAt).toBe('2026-10-27T09:00:00.000Z');
    expect(file.tables.tasks.length).toBe(2);
    expect(file.tables.logbook.length).toBe(1);
    expect(JSON.stringify(file.tables.settings)).toContain('Trần Minh Anh');
  });

  it('leaves nothing on the phone, and the board reads empty', async () => {
    const { db, store } = await usedBoard();
    await wipePhone(db);
    for (const table of PERSON_TABLES) {
      expect(db.column(`SELECT COUNT(*) FROM ${table}`)).toEqual([0]);
    }
    await store.load();
    expect(store.getSnapshot().board).toEqual([]);
  });
});
