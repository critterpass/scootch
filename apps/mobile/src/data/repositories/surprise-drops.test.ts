import { describe, expect, it } from '@jest/globals';

import { openRepositories } from '../repositories';
import { openTestDatabase } from '../test/open-test-database';

import type { SurpriseDropRow } from './surprise-drops';

const drop: SurpriseDropRow = {
  id: 'drop-1',
  taskId: 'task-1',
  catchNumber: 8,
  pick: 0.25,
  droppedOn: '2026-10-06',
  choice: null,
};

describe('surprise drops', () => {
  it('keeps a drop and the answer given to it', async () => {
    const { surpriseDrops } = openRepositories((await openTestDatabase()).db);
    await surpriseDrops.put(drop);
    expect(await surpriseDrops.all()).toEqual([drop]);
    await surpriseDrops.put({ ...drop, choice: 'wear' });
    expect(await surpriseDrops.where('taskId', 'task-1')).toEqual([{ ...drop, choice: 'wear' }]);
  });

  it('refuses a row that is not a drop', async () => {
    const { surpriseDrops } = openRepositories((await openTestDatabase()).db);
    await expect(surpriseDrops.put({ ...drop, pick: 1 })).rejects.toThrow();
    await expect(surpriseDrops.put({ ...drop, catchNumber: 0 })).rejects.toThrow();
    expect(await surpriseDrops.all()).toEqual([]);
  });
});
