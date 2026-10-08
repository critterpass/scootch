import type { RowSchema } from '../table';

/**
 * A row schema for a table that gained optional fields after rows were first stored. A table reads
 * an empty column as null; with this, such a field is left out of the row instead. A row stored
 * before the field existed then reads exactly as it did, and a backup of it is the one an earlier
 * app would have made.
 */
export function absentWhenNull<Row>(
  schema: RowSchema<Row>,
  fields: readonly (keyof Row & string)[],
): RowSchema<Row> {
  return {
    shape: schema.shape,
    parse: (value) => {
      if (typeof value !== 'object' || value === null) return schema.parse(value);
      const row: Record<string, unknown> = { ...value };
      for (const field of fields) if (row[field] === null) delete row[field];
      return schema.parse(row);
    },
  };
}
