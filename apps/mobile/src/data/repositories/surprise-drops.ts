import type { Id, IsoDate } from '@scootch/domain';

import { createTable, type RowSchema, type SqlDatabase, type Table } from '../table';

/** One surprise drop, kept for good. It is earned by a finish and by nothing else. */
export interface SurpriseDropRow {
  readonly id: Id;
  /** The task whose finish gave it. */
  readonly taskId: Id;
  /** Which catch it fell on, counted from one. */
  readonly catchNumber: number;
  /** A number from 0 up to 1 that chooses the item. */
  readonly pick: number;
  readonly droppedOn: IsoDate;
  /** What the person tapped on the drop: `null` until they have seen it. */
  readonly choice: 'wear' | 'later' | null;
}

const text = (value: unknown): value is string => typeof value === 'string' && value.length > 0;

function parse(value: unknown): SurpriseDropRow {
  const row = value as Partial<Record<keyof SurpriseDropRow, unknown>>;
  const { id, taskId, catchNumber, pick, droppedOn, choice } = row;
  const valid =
    text(id) &&
    text(taskId) &&
    typeof catchNumber === 'number' &&
    Number.isInteger(catchNumber) &&
    catchNumber >= 1 &&
    typeof pick === 'number' &&
    pick >= 0 &&
    pick < 1 &&
    text(droppedOn) &&
    /^\d{4}-\d{2}-\d{2}$/.test(droppedOn) &&
    (choice === null || choice === 'wear' || choice === 'later');
  if (!valid) throw new Error('Not a surprise drop row');
  return { id, taskId, catchNumber, pick, droppedOn, choice };
}

/** The row's fields, in column order, with the check every read and write goes through. */
export const surpriseDropRowSchema: RowSchema<SurpriseDropRow> = {
  shape: { id: 0, taskId: 0, catchNumber: 0, pick: 0, droppedOn: 0, choice: 0 },
  parse,
};

/** Surprise drops. Nothing sold can write here: the only writer is a finish. */
export function surpriseDropsRepository(db: SqlDatabase): Table<SurpriseDropRow> {
  return createTable(db, { name: 'surprise_drops', schema: surpriseDropRowSchema, key: 'id' });
}
